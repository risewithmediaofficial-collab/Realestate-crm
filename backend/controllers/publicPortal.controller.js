const Project = require('../models/Project.model');
const Unit = require('../models/Unit.model');
const Lead = require('../models/Lead.model');
const Booking = require('../models/Booking.model');
const Payment = require('../models/Payment.model');
const SiteVisit = require('../models/SiteVisit.model');
const Notification = require('../models/Notification.model');

// ── GET /api/public/projects ────────────────────────────────────────────────
// Public catalog of active real estate projects with search and filters
exports.getPublicProjects = async (req, res) => {
  try {
    const {
      city,
      type,
      status,
      minBudget,
      maxBudget,
      bhk,
      search,
      page = 1,
      limit = 24
    } = req.query;

    const query = {};

    // Don't show sold_out or on_hold by default unless specifically asked
    if (status) {
      query.status = status;
    } else {
      query.status = { $nin: ['sold_out', 'on_hold'] };
    }

    if (city) {
      query.city = { $regex: new RegExp(city, 'i') };
    }

    if (type) {
      query.type = type;
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { name: searchRegex },
        { city: searchRegex },
        { address: searchRegex },
        { landmark: searchRegex },
        { description: searchRegex }
      ];
    }

    if (minBudget || maxBudget) {
      query['priceRange.min'] = {};
      if (minBudget) query['priceRange.min'].$gte = Number(minBudget);
      if (maxBudget) query['priceRange.max'] = { $lte: Number(maxBudget) };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [projects, total] = await Promise.all([
      Project.find(query)
        .select('name code description logo images brochure address city state pincode landmark type categoryDetails totalArea totalUnits reraNumber launchDate possessionDate status priceRange towers unitTypes amenities organization')
        .sort({ launchDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Project.countDocuments(query)
    ]);

    // Attach count of available units for each project
    const projectIds = projects.map(p => p._id);
    const availableCounts = await Unit.aggregate([
      { $match: { project: { $in: projectIds }, status: 'available' } },
      { $group: { _id: '$project', count: { $sum: 1 }, minRate: { $min: '$pricing.basePrice' } } }
    ]);

    const countMap = {};
    availableCounts.forEach(c => {
      countMap[c._id.toString()] = { availableUnits: c.count, minBasePrice: c.minRate };
    });

    const enrichedProjects = projects.map(p => ({
      ...p,
      availableUnitsCount: countMap[p._id.toString()]?.availableUnits || 0,
      lowestAvailablePrice: countMap[p._id.toString()]?.minBasePrice || p.priceRange?.min || 0
    }));

    res.json({
      success: true,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      projects: enrichedProjects
    });
  } catch (err) {
    console.error('getPublicProjects error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch public projects' });
  }
};

// ── GET /api/public/projects/:id ────────────────────────────────────────────
// Detailed project profile
exports.getPublicProjectById = async (req, res) => {
  try {
    const { id } = req.params;
    let project = null;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      project = await Project.findById(id).lean();
    } else {
      project = await Project.findOne({ code: id.toUpperCase() }).lean();
    }

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Get live inventory statistics for this project
    const [totalUnits, availableUnits] = await Promise.all([
      Unit.countDocuments({ project: project._id }),
      Unit.countDocuments({ project: project._id, status: 'available' })
    ]);

    res.json({
      success: true,
      project: {
        ...project,
        inventorySummary: {
          totalUnits,
          availableUnits,
          soldUnits: totalUnits - availableUnits
        }
      }
    });
  } catch (err) {
    console.error('getPublicProjectById error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch project details' });
  }
};

// ── GET /api/public/projects/:id/units ──────────────────────────────────────
// Available inventory units for a project that users can browse and book
exports.getPublicProjectUnits = async (req, res) => {
  try {
    const { id } = req.params;
    const { bhk, tower, floor, minPrice, maxPrice, propertyType } = req.query;

    const query = {
      project: id,
      status: 'available'
    };

    if (bhk) {
      query.bedrooms = Number(bhk);
    }
    if (tower) {
      query.tower = tower;
    }
    if (floor) {
      query.floor = Number(floor);
    }
    if (propertyType) {
      query.propertyType = propertyType;
    }
    if (minPrice || maxPrice) {
      query['pricing.totalPrice'] = {};
      if (minPrice) query['pricing.totalPrice'].$gte = Number(minPrice);
      if (maxPrice) query['pricing.totalPrice'].$lte = Number(maxPrice);
    }

    const units = await Unit.find(query)
      .select('unitNumber tower floor propertyType type facing area bedrooms bathrooms balconies pricing physicalDetails status')
      .sort({ floor: 1, unitNumber: 1 })
      .lean();

    res.json({
      success: true,
      total: units.length,
      units
    });
  } catch (err) {
    console.error('getPublicProjectUnits error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch project units' });
  }
};

// ── POST /api/public/inquiry ────────────────────────────────────────────────
// Ingest lead from website brochure download, callback request, or contact form
exports.createPublicInquiry = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      interestedProject,
      preferredBhk,
      budget,
      city,
      locality,
      notes,
      source = 'website',
      utmSource,
      utmCampaign
    } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Name and Phone number are required' });
    }

    // Determine target organization from project or fallback
    let organization = 'MRP REAL ESTATE';
    let projectDoc = null;
    if (interestedProject) {
      projectDoc = await Project.findById(interestedProject);
      if (projectDoc?.organization) {
        organization = projectDoc.organization;
      }
    }

    // Check if lead already exists by phone & org
    let lead = await Lead.findOne({ phone: phone.trim(), organization });

    if (lead) {
      // Update existing lead with fresh interest
      lead.activities.push({
        type: 'note',
        title: 'New Website Inquiry Received',
        description: `Buyer revisited website. Interested in: ${projectDoc?.name || 'General Inquiry'}. Preferred BHK: ${preferredBhk || 'Any'}. Notes: ${notes || 'None'}`,
        performedAt: new Date()
      });
      if (interestedProject) lead.interestedProject = interestedProject;
      if (budget) lead.budget = { max: Number(budget) };
      await lead.save();
    } else {
      // Create new lead in CRM
      lead = await Lead.create({
        name: name.trim(),
        email: email ? email.toLowerCase().trim() : undefined,
        phone: phone.trim(),
        city: city || projectDoc?.city,
        locality: locality || projectDoc?.landmark,
        interestedProject: interestedProject || undefined,
        budget: budget ? { max: Number(budget) } : undefined,
        source: 'website',
        utmSource: utmSource || 'public_portal',
        utmCampaign: utmCampaign || 'organic_direct',
        stage: 'new',
        organization,
        notes: notes ? `Website Inquiry: ${notes}` : 'Captured via Public Website Portal',
        activities: [{
          type: 'note',
          title: 'Lead Captured from Public Website',
          description: `Inquiry submitted for ${projectDoc?.name || 'Properties'}. Preferred BHK: ${preferredBhk || 'Not specified'}`,
          performedAt: new Date()
        }]
      });
    }

    // Create system notification in CRM
    await Notification.create({
      title: '🌐 New Online Website Lead',
      message: `${name} (${phone}) submitted an inquiry for ${projectDoc?.name || 'your portfolio'}.`,
      type: 'lead',
      relatedId: lead._id,
      organization,
      read: false
    }).catch(() => {});

    res.status(201).json({
      success: true,
      message: 'Thank you for your inquiry! Our senior property advisor will get in touch shortly.',
      leadId: lead._id
    });
  } catch (err) {
    console.error('createPublicInquiry error:', err);
    res.status(500).json({ success: false, message: 'Failed to process inquiry' });
  }
};

// ── POST /api/public/site-visits ────────────────────────────────────────────
// Public booking for site visits
exports.createPublicSiteVisit = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      projectId,
      scheduledDate,
      scheduledTime = '11:00 AM',
      notes
    } = req.body;

    if (!name || !phone || !projectId || !scheduledDate) {
      return res.status(400).json({ success: false, message: 'Name, phone, project, and visit date are required' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Selected project not found' });
    }

    const organization = project.organization || 'MRP REAL ESTATE';

    // Find or create lead
    let lead = await Lead.findOne({ phone: phone.trim(), organization });
    if (!lead) {
      lead = await Lead.create({
        name: name.trim(),
        email: email ? email.toLowerCase().trim() : undefined,
        phone: phone.trim(),
        city: project.city,
        interestedProject: project._id,
        source: 'website',
        stage: 'site_visit_scheduled',
        organization,
        notes: `Online VIP Site Visit Scheduled for ${scheduledDate} at ${scheduledTime}`
      });
    } else {
      lead.stage = 'site_visit_scheduled';
      lead.interestedProject = project._id;
      lead.activities.push({
        type: 'site_visit',
        title: `Site Visit Scheduled via Website`,
        description: `Date: ${scheduledDate} at ${scheduledTime} for ${project.name}`,
        performedAt: new Date()
      });
      await lead.save();
    }

    // Create SiteVisit record
    const siteVisit = await SiteVisit.create({
      lead: lead._id,
      project: project._id,
      scheduledDate: new Date(scheduledDate),
      scheduledTime,
      status: 'scheduled',
      notes: notes || 'Booked online via Customer Real Estate Website',
      organization
    });

    // Notify CRM
    await Notification.create({
      title: '📅 VIP Site Visit Scheduled Online',
      message: `${name} scheduled a site visit to ${project.name} on ${scheduledDate} (${scheduledTime}).`,
      type: 'site_visit',
      relatedId: siteVisit._id,
      organization,
      read: false
    }).catch(() => {});

    res.status(201).json({
      success: true,
      message: `Site visit to ${project.name} confirmed for ${scheduledDate} at ${scheduledTime}!`,
      siteVisitId: siteVisit._id
    });
  } catch (err) {
    console.error('createPublicSiteVisit error:', err);
    res.status(500).json({ success: false, message: 'Failed to schedule site visit' });
  }
};

// ── POST /api/public/booking ────────────────────────────────────────────────
// End-to-end self-service property unit booking
exports.createPublicBooking = async (req, res) => {
  try {
    const {
      unitId,
      customerName,
      customerPhone,
      customerEmail,
      panNumber,
      aadharNumber,
      address,
      city,
      state,
      pincode,
      coApplicants = [],
      paymentMethod = 'upi',
      tokenAmount = 50000,
      notes
    } = req.body;

    if (!unitId || !customerName || !customerPhone) {
      return res.status(400).json({ success: false, message: 'Unit ID, Customer Name, and Phone are required' });
    }

    // 1. Fetch & lock Unit
    const unit = await Unit.findById(unitId).populate('project');
    if (!unit) {
      return res.status(404).json({ success: false, message: 'Property unit not found' });
    }

    if (unit.status !== 'available') {
      return res.status(409).json({
        success: false,
        message: `Unit ${unit.unitNumber} is no longer available (Status: ${unit.status}). Please select another available unit.`
      });
    }

    const organization = unit.project?.organization || 'MRP REAL ESTATE';
    const totalUnitAmount = unit.pricing?.totalPrice || unit.pricing?.basePrice || 0;

    // 2. Find or create Lead
    let lead = await Lead.findOne({ phone: customerPhone.trim(), organization });
    if (!lead) {
      lead = await Lead.create({
        name: customerName.trim(),
        email: customerEmail ? customerEmail.toLowerCase().trim() : undefined,
        phone: customerPhone.trim(),
        city: city || unit.project?.city,
        interestedProject: unit.project?._id,
        source: 'website',
        stage: 'booked',
        organization,
        notes: `Direct Online Booking for Unit ${unit.unitNumber}`
      });
    } else {
      lead.stage = 'booked';
      lead.interestedProject = unit.project?._id;
      lead.activities.push({
        type: 'stage_change',
        title: `Self-Service Online Booking Submitted`,
        description: `Reserved Unit ${unit.unitNumber} with token advance of ₹${Number(tokenAmount).toLocaleString()}`,
        performedAt: new Date()
      });
      await lead.save();
    }

    // 3. Flip Unit status to 'booked'
    unit.status = 'booked';
    await unit.save();

    // 4. Create Official Booking record
    const booking = new Booking({
      lead: lead._id,
      unit: unit._id,
      project: unit.project?._id,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerEmail: customerEmail ? customerEmail.toLowerCase().trim() : undefined,
      panNumber: panNumber ? panNumber.toUpperCase().trim() : undefined,
      aadharNumber: aadharNumber ? aadharNumber.trim() : undefined,
      coApplicants: coApplicants.map(c => ({
        name: c.name,
        phone: c.phone,
        email: c.email,
        relation: c.relation,
        panNumber: c.panNumber
      })),
      basePrice: unit.pricing?.basePrice || 0,
      totalAmount: totalUnitAmount,
      bookingAmount: Number(tokenAmount),
      bookingAmountPaid: true,
      bookingAmountDate: new Date(),
      bookingAmountMode: ['cheque', 'neft', 'rtgs', 'upi', 'cash', 'dd'].includes(paymentMethod) ? paymentMethod : 'upi',
      paidAmount: Number(tokenAmount),
      balanceAmount: Math.max(0, totalUnitAmount - Number(tokenAmount)),
      status: 'application_submitted',
      organization,
      notes: notes || `Direct Self-Service Booking via Online Website Portal. Address: ${address || ''}, ${city || ''}`
    });

    await booking.save();

    // 5. Create Payment record for token advance
    await Payment.create({
      booking: booking._id,
      demandAmount: Number(tokenAmount),
      paidAmount: Number(tokenAmount),
      balanceAmount: 0,
      paymentDate: new Date(),
      paymentMode: booking.bookingAmountMode,
      status: 'completed',
      type: 'token_advance',
      transactionReference: `TXN-WEB-${Date.now()}`,
      organization
    }).catch(e => console.warn('Payment logging notice:', e.message));

    // 6. Notify CRM
    await Notification.create({
      title: '🎉 Direct Online Property Booking!',
      message: `${customerName} booked Unit ${unit.unitNumber} (${unit.project?.name}) online! Token advance ₹${Number(tokenAmount).toLocaleString()} logged.`,
      type: 'booking',
      relatedId: booking._id,
      organization,
      read: false
    }).catch(() => {});

    res.status(201).json({
      success: true,
      message: 'Congratulations! Your property unit has been officially reserved.',
      booking: {
        bookingId: booking._id,
        bookingNumber: booking.bookingNumber,
        unitNumber: unit.unitNumber,
        projectName: unit.project?.name,
        bhk: unit.bedrooms,
        floor: unit.floor,
        carpetArea: unit.area?.carpetArea || unit.area?.sqft,
        totalAmount: totalUnitAmount,
        tokenAmountPaid: Number(tokenAmount),
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail,
        createdAt: booking.createdAt,
        status: 'application_submitted'
      }
    });
  } catch (err) {
    console.error('createPublicBooking error:', err);
    res.status(500).json({ success: false, message: 'Failed to complete online booking: ' + err.message });
  }
};

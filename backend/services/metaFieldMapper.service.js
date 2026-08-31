/**
 * Meta Field Mapper Service
 * Normalizes raw Meta Graph API field data into standard CRM lead schema.
 */

function parseBudgetString(budgetStr) {
  if (!budgetStr) return { min: undefined, max: undefined };
  const str = budgetStr.toLowerCase().trim();

  // Try matching Lakhs / Crores
  // e.g. "1.2 cr - 1.5 cr", "80l - 1cr", "50 lakhs", "above 2 cr", "7500000"
  let min, max;

  const crMatch = str.match(/([\d\.]+)\s*(?:cr|crore)/gi);
  if (crMatch && crMatch.length > 0) {
    const numbers = str.match(/[\d\.]+/g).map(Number);
    if (numbers.length >= 2) {
      min = Math.round(numbers[0] * 10000000);
      max = Math.round(numbers[1] * 10000000);
    } else if (numbers.length === 1) {
      max = Math.round(numbers[0] * 10000000);
      min = Math.round(max * 0.8);
    }
  }

  const lkMatch = str.match(/([\d\.]+)\s*(?:l|lac|lakh)/gi);
  if (!min && lkMatch && lkMatch.length > 0) {
    const numbers = str.match(/[\d\.]+/g).map(Number);
    if (numbers.length >= 2) {
      min = Math.round(numbers[0] * 100000);
      max = Math.round(numbers[1] * 100000);
    } else if (numbers.length === 1) {
      max = Math.round(numbers[0] * 100000);
      min = Math.round(max * 0.8);
    }
  }

  if (!min && !max) {
    const rawNumber = parseInt(str.replace(/[^\d]/g, ''), 10);
    if (!isNaN(rawNumber) && rawNumber > 100000) {
      max = rawNumber;
      min = Math.round(max * 0.8);
    }
  }

  return { min, max };
}

/**
 * Maps raw Meta leadgen payload to CRM lead attributes
 */
function mapMetaFields(metaLeadData, formMapping = null) {
  const fieldData = metaLeadData.field_data || [];
  const rawMap = {};
  fieldData.forEach(item => {
    if (item.name && item.values && item.values.length > 0) {
      rawMap[item.name.toLowerCase().trim()] = item.values[0];
    }
  });

  const lead = {
    name: '',
    phone: '',
    email: '',
    city: '',
    locality: '',
    budget: {},
    interestedUnitType: '',
    notes: '',
    rawMetaFields: rawMap,
  };

  const customMappings = formMapping?.fieldMappings || [];
  const mappedMetaKeys = new Set();

  // 1. Process custom user-configured field mappings first
  customMappings.forEach(mapping => {
    const metaKey = (mapping.metaField || '').toLowerCase().trim();
    const crmField = (mapping.crmField || '').trim();
    let val = rawMap[metaKey] || mapping.defaultValue || '';

    if (val) {
      mappedMetaKeys.add(metaKey);
      if (crmField === 'name') lead.name = val;
      else if (crmField === 'phone') lead.phone = val;
      else if (crmField === 'email') lead.email = val;
      else if (crmField === 'city') lead.city = val;
      else if (crmField === 'locality') lead.locality = val;
      else if (crmField === 'interestedUnitType') lead.interestedUnitType = val;
      else if (crmField === 'budget') lead.budget = parseBudgetString(val);
      else if (crmField === 'notes') lead.notes = (lead.notes ? lead.notes + '\n' : '') + val;
    }
  });

  // 2. Heuristic fallback for standard Meta form keys if not already mapped
  Object.entries(rawMap).forEach(([key, val]) => {
    if (mappedMetaKeys.has(key)) return;

    // Full Name
    if (!lead.name && (key.includes('full_name') || key === 'name' || key === 'first_name')) {
      lead.name = val;
      if (key === 'first_name' && rawMap['last_name']) {
        lead.name = `${val} ${rawMap['last_name']}`.trim();
      }
      mappedMetaKeys.add(key);
      return;
    }

    // Phone
    if (!lead.phone && (key.includes('phone') || key.includes('mobile') || key.includes('contact'))) {
      lead.phone = val;
      mappedMetaKeys.add(key);
      return;
    }

    // Email
    if (!lead.email && (key.includes('email') || key.includes('e-mail'))) {
      lead.email = val;
      mappedMetaKeys.add(key);
      return;
    }

    // City / Locality
    if (!lead.city && (key.includes('city') || key.includes('location'))) {
      lead.city = val;
      mappedMetaKeys.add(key);
      return;
    }

    // Budget
    if (!lead.budget?.max && (key.includes('budget') || key.includes('price') || key.includes('investment'))) {
      lead.budget = parseBudgetString(val);
      mappedMetaKeys.add(key);
      return;
    }

    // Configuration (2BHK, 3BHK, etc.)
    if (!lead.interestedUnitType && (key.includes('bhk') || key.includes('unit') || key.includes('config') || key.includes('property_type'))) {
      lead.interestedUnitType = val;
      mappedMetaKeys.add(key);
      return;
    }
  });

  // 3. Collect any remaining unmapped custom questions into notes
  const unmappedQuestions = [];
  Object.entries(rawMap).forEach(([key, val]) => {
    if (!mappedMetaKeys.has(key)) {
      const formattedKey = key.replace(/_/g, ' ').replace(/\?/g, '');
      unmappedQuestions.push(`${formattedKey}: ${val}`);
    }
  });

  if (unmappedQuestions.length > 0) {
    const extraNotes = unmappedQuestions.join('\n');
    lead.notes = lead.notes ? `${lead.notes}\n\n${extraNotes}` : extraNotes;
  }

  // Fallbacks if name or phone are still empty
  if (!lead.name) lead.name = 'Meta Ad Prospect';
  if (!lead.phone && rawMap['phone_number']) lead.phone = rawMap['phone_number'];

  return lead;
}

module.exports = {
  mapMetaFields,
  parseBudgetString,
};

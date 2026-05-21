const path = require('path');
const fs = require('fs');
const logger = require('./logger');

// Load once at startup
const treatmentsPath = path.join(__dirname, '../../data/treatments.json');
const treatments = JSON.parse(fs.readFileSync(treatmentsPath, 'utf-8'));

// Build a map for O(1) lookup by disease id
const treatmentMap = new Map(treatments.map(t => [t.id, t]));

const FALLBACK_TREATMENTS = {
  high: {
    recommended_treatment_en: [
      'Remove and destroy all visibly infected plant parts immediately',
      'Apply a broad-spectrum fungicide or bactericide appropriate for your crop',
      'Isolate affected area to prevent spread to healthy plants',
      'Consult a local agricultural extension officer for targeted treatment',
    ],
    recommended_treatment_ha: [
      'Cire kuma ƙone dukkan sassan tsiro da cutar ta kama nan da nan',
      'Yi amfani da maganin fungal ko bacterial da ya dace da amfanin gonarku',
      'Keɓe wurin da cutar ta kama don hana yaɗuwa zuwa tsiro masu lafiya',
      'Tuntubi ƙwararren aikin gona a yankinku don maganin da ya fi dacewa',
    ],
    future_prevention_en: [
      'Practice crop rotation each season',
      'Use certified disease-free seeds in future planting',
      'Maintain proper plant spacing for airflow',
      'Regularly inspect crops and act early on any signs of disease',
    ],
    future_prevention_ha: [
      'Yi juyin amfanin gona kowane lokacin shuka',
      'Yi amfani da iri masu tsafta waɗanda ba su da cuta',
      'Kula da tazara mai kyau tsakanin tsirrai don iska ta wuce',
      'Duba amfanin gona akai-akai kuma yi aiki da wuri idan an ga alamun cuta',
    ],
  },
  moderate: {
    recommended_treatment_en: [
      'Remove infected leaves and dispose of them away from the field',
      'Apply a suitable fungicide or bactericide at recommended dosage',
      'Reduce humidity around plants by improving drainage and spacing',
      'Monitor closely every 3–4 days for signs of spread',
    ],
    recommended_treatment_ha: [
      'Cire ganyen da ke ɗauke da cuta kuma a jefar da su nesa da gonar',
      'Yi amfani da maganin da ya dace da adadin da aka ba da shawarar',
      'Rage danshi kusa da tsirrai ta hanyar inganta magudanar ruwa',
      'Duba gonar kowace kwana 3-4 don ganin ko cutar tana yaɗuwa',
    ],
    future_prevention_en: [
      'Avoid overhead irrigation; water at the base of plants',
      'Remove crop debris after harvest to reduce disease carry-over',
      'Select resistant varieties where available',
    ],
    future_prevention_ha: [
      'Guji ban ruwa daga sama; zuba ruwa a gindin tsirrai',
      'Cire ragowar amfanin gona bayan girbi don rage dawowar cuta',
      'Zaɓi nau\'ikan da ke jurewa cutar idan akwai',
    ],
  },
  low: {
    recommended_treatment_en: [
      'Monitor affected plants weekly for any worsening',
      'Remove the few infected leaves by hand',
      'Apply neem extract or organic spray as a mild treatment',
    ],
    recommended_treatment_ha: [
      'Duba tsirran da abin ya shafa kowane mako don ganin ko yana taɓarɓarewa',
      'Cire ganyen da ke ɗauke da cuta da hannu',
      'Yi amfani da ruwan ganyen neem ko feshi na halitta a matsayin magani mai laushi',
    ],
    future_prevention_en: [
      'Keep the field weed-free to reduce disease hosts',
      'Ensure good soil drainage before next planting season',
      'Use clean, certified seed next season',
    ],
    future_prevention_ha: [
      'Kula da tsaftar gonar ta hanyar cire ciyayi don rage masu ɗaukar cuta',
      'Tabbatar da magudanar ƙasa mai kyau kafin lokacin shuka na gaba',
      'Yi amfani da iri masu tsafta da inganci a lokacin shuka mai zuwa',
    ],
  },
};

function getFallbackTreatment(diseaseId, severity, cropType, language) {
  const lang = language === 'ha' ? 'ha' : 'en';
  const severityKey = FALLBACK_TREATMENTS[severity] ? severity : 'moderate';
  const fallback = FALLBACK_TREATMENTS[severityKey];

  return {
    name: diseaseId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    crop: cropType || 'Unknown',
    recommendations: fallback[`recommended_treatment_${lang}`],
    futurePrevention: fallback[`future_prevention_${lang}`],
    isFallback: true, // flag so frontend can show advisory note
    severityUsed: severityKey,
  };
}

/**
 * Get treatment recommendations for a disease
 * @param {string} diseaseId  - e.g. "rice_bacterial_leaf_blight"
 * @param {string} severity   - "high" | "moderate" | "low"
 * @param {string} language   - "en" | "ha"
 * @returns {{ recommendations: string[], futurePrevention: string[], name: string } | null}
 */

function getTreatment(diseaseId, severity, language = 'en', cropType = null) {
  const entry = treatmentMap.get(diseaseId);

  if (!entry) {
    logger.warn('No treatment entry found — using fallback', {
      diseaseId,
      severity,
      language,
      action: 'Add this disease to treatments.json for specific recommendations',
    });
    return getFallbackTreatment(diseaseId, severity, cropType, language);
  }

  const severityKey = entry.severities[severity]
    ? severity
    : entry.severities['moderate']
    ? 'moderate'
    : Object.keys(entry.severities)[0];

  const severityData = entry.severities[severityKey];
  const lang = language === 'ha' ? 'ha' : 'en';

  return {
    name: lang === 'ha' ? entry.name_ha : entry.name_en,
    crop: entry.crop,
    recommendations: severityData[`recommended_treatment_${lang}`] || [],
    futurePrevention: severityData[`future_prevention_${lang}`] || [],
    isFallback: false,
    severityUsed: severityKey,
  };
}

module.exports = { getTreatment };
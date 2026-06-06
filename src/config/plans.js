// config/plans.js
module.exports = {
  trial: {
    diagnosisPerDay: Infinity,
    expertSessions: Infinity,
    trialDays: 7,
    features: {
      expertChat: true,
      voicedTreatment: true,
      advancedTreatment: true,
      weatherPodcast: true,
      advancedWeather: true,
      locationWeather: true,
      nomaApp2: true,
      diseaseAlert: true,
      smsWhatsapp: true
    }
  },
  free: {
    diagnosisPerDay: 3,
    expertSessions: 0,
    features: {
      expertChat: false,
      voicedTreatment: false,
      advancedTreatment: false,
      weatherPodcast: true,
      advancedWeather: false,
      locationWeather: false,
      nomaApp2: false,
      diseaseAlert: false,
      smsWhatsapp: false
    }
  },
  basic: {
    diagnosisPerDay: 10,
    expertSessions: 5,
    features: {
      expertChat: true,
      voicedTreatment: true,
      advancedTreatment: true,
      weatherPodcast: true,
      advancedWeather: true,
      locationWeather: false,
      nomaApp2: false,
      diseaseAlert: false,
      smsWhatsapp: false
    }
  },
  premium: {
    diagnosisPerDay: Infinity,
    expertSessions: Infinity,
    features: {
      expertChat: true,
      voicedTreatment: true,
      advancedTreatment: true,
      weatherPodcast: true,
      advancedWeather: true,
      locationWeather: true,
      nomaApp2: true,
      diseaseAlert: true,
      smsWhatsapp: true
    }
  }
};
// services/pushNotification.service.js
const axios = require('axios');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Send a push notification to a single Expo push token
 * @param {string} expoPushToken
 * @param {string} title
 * @param {string} body
 * @param {object} data  — extra payload sent to the app
 */
const sendPushNotification = async (expoPushToken, title, body, data = {}) => {
  if (!expoPushToken) return;

  try {
    await axios.post(
      EXPO_PUSH_URL,
      {
        to: expoPushToken,
        sound: 'default',
        title,
        body,
        data
      },
      {
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (err) {
    // Non-fatal — log and continue
    console.error('Push notification error:', err.message);
  }
};

// ─── Notification Templates ────────────────────────────────────────────────

const notify = {
  documentsReceived: (token) =>
    sendPushNotification(
      token,
      '📄 Documents received',
      'Your verification documents are under review. We\'ll notify you within 48 hours.',
      { screen: 'ExpertVerification' }
    ),

  documentsApproved: (token) =>
    sendPushNotification(
      token,
      '✅ Documents approved!',
      'Your professional credentials have been verified. You can now take the competency assessment.',
      { screen: 'ExpertVerification', stage: '3' }
    ),

  documentsRejected: (token, reason) =>
    sendPushNotification(
      token,
      '❌ Documents not accepted',
      reason || 'Your documents could not be verified. Please check your dashboard for details.',
      { screen: 'ExpertVerification', stage: '2' }
    ),



  assessmentPassed: (token, score) =>
    sendPushNotification(
      token,
      '🎉 You are now a NomaApp Expert!',
      `You scored ${score}% on the competency assessment. Welcome to the expert network!`,
      { screen: 'ExpertDashboard' }
    ),

  assessmentFailed: (token, score, attemptsLeft) =>
    sendPushNotification(
      token,
      '📝 Assessment result',
      `You scored ${score}%. You need 70% to pass. ${attemptsLeft} attempt(s) remaining.`,
      { screen: 'ExpertVerification', stage: '3' }
    ),

  newCaseAssigned: (token, { farmerName, cropType, disease }) =>
    sendPushNotification(
      token,
      '🌾 New case assigned',
      `${farmerName} sent you a ${cropType} diagnosis${disease ? ` (${disease})` : ''} for review.`,
      { screen: 'ExpertCases' }
    ),

  caseResolved: (token, { expertName }) =>
    sendPushNotification(
      token,
      '✅ Your expert responded',
      `${expertName} has responded to your case. Tap to view.`,
      { screen: 'CaseDetail' }
    )
};

module.exports = { sendPushNotification, notify };
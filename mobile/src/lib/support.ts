import { Alert, Linking } from 'react-native';
import { config } from '../config';

export const SUPPORT_HOURS = 'Our team is here to help. Reply times depend on how busy we are.';

function notConfigured() {
  Alert.alert(
    'Support line not connected yet',
    'This build does not have a support number configured. Please check back soon.',
  );
}

export async function openWhatsApp(message?: string) {
  if (!config.supportWhatsApp) return notConfigured();
  const url = `https://wa.me/${config.supportWhatsApp}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert("Couldn't open WhatsApp", 'Please make sure WhatsApp is installed, or call us instead.');
  }
}

export async function callSupport() {
  if (!config.supportPhone) return notConfigured();
  try {
    await Linking.openURL(`tel:${config.supportPhone}`);
  } catch {
    Alert.alert("Couldn't start the call", `You can call us on ${config.supportPhone}.`);
  }
}

export const FAQS: { q: string; a: string }[] = [
  {
    q: 'When does my cover start?',
    a: 'Your application is reviewed first. Cover starts once it is approved and your first monthly payment has been received. Some cover has a waiting period, which your plan shows.',
  },
  {
    q: 'Can I add my family?',
    a: 'Yes. You can add a spouse, children, parents or extended family for a small monthly fee each. The fee and age limits are shown on your plan, and the total updates as you add people.',
  },
  {
    q: 'How do I pay?',
    a: 'Monthly, by debit order from your bank account. Your bank asks you to approve the debit order before anything is collected. If debit orders are not switched on for your plan yet, nothing is collected.',
  },
  {
    q: 'What is a waiting period?',
    a: 'A set number of days after cover starts before a claim can be paid for a natural cause. Your plan shows its waiting period, and people added later have their own.',
  },
  {
    q: 'How do I make a claim?',
    a: 'Open My Cover, choose Make A Claim, and tell us who has passed away. If you need a person right now, call or WhatsApp us from this screen.',
  },
  {
    q: 'Is my information safe?',
    a: 'Your ID number is encrypted when stored, and we only show the last four digits in the app. We never ask for your card or banking passwords in the app.',
  },
];

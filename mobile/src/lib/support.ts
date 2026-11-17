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
    q: 'How does the cover work?',
    a: 'You build a bundle of groceries and livestock for your family, and pay a small amount each month. When someone on your cover passes away, we deliver the bundle to your family.',
  },
  {
    q: 'When does my cover start?',
    a: 'Your application is reviewed first. Cover starts once it is approved and your first monthly payment has been received. Natural causes have a waiting period, and accidents usually do not. Your cover screen shows the exact dates.',
  },
  {
    q: 'Can I add my family?',
    a: 'Yes. You can add a spouse, children, parents, parents-in-law, grandparents, siblings and other family. You will need their ID number and their relationship to you. Each person adds a small monthly fee.',
  },
  {
    q: 'Can I change my bundle later?',
    a: 'Yes. If you reduce it, that applies straight away. If you increase it, the extra pays out after a new waiting period, and your current bundle stays payable in the meantime.',
  },
  {
    q: 'How do I pay?',
    a: 'Monthly, by debit order from your bank account. Your bank asks you to approve it before anything is collected. If debit orders are not switched on yet, nothing is collected.',
  },
  {
    q: 'Is slaughter and preparation included?',
    a: 'No. We deliver the livestock, and preparation is arranged separately with our team.',
  },
  {
    q: 'How do I make a claim?',
    a: 'Open My Cover and choose Make A Claim. If you need a person right now, call or WhatsApp us from the same screen. We will call to confirm delivery.',
  },
  {
    q: 'Is my information safe?',
    a: 'Your ID number is encrypted when stored, and we only show the last four digits in the app. We never ask for your card or banking password in the app.',
  },
];

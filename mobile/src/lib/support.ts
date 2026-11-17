import { Alert, Linking } from 'react-native';
import { config } from '../config';

export const SUPPORT_HOURS = 'Our team is here to help. Reply times depend on how busy we are.';

function notConfigured() {
  Alert.alert(
    'Support line not connected yet',
    'This build does not have a support number configured. Please check back soon, or use Report A Problem and we will pick it up.',
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
    q: 'How do I order for family in another town?',
    a: 'At checkout, enter your family member as the recipient and choose the province and address where everything should go. You can place the order from anywhere in South Africa.',
  },
  {
    q: 'Can I change a package?',
    a: 'Yes. Open any package and adjust it: change quantities, add a cow or extra hampers, remove optional items. The price updates as you go.',
  },
  {
    q: 'Is slaughter and dressing included with livestock?',
    a: 'No. Preparation is a separate service that you can add where it is offered in your delivery area. Our team confirms availability with you.',
  },
  {
    q: 'When will my order arrive?',
    a: 'You choose the delivery date and a preferred window. Once your order is received, our team confirms what is possible with you. A date is a preference until it is confirmed.',
  },
  {
    q: 'How do I pay?',
    a: 'You will be able to pay by card or instant EFT. If online payment is not yet switched on for your order, it stays as received and we will let you know how to pay.',
  },
  {
    q: 'I need something that is not listed.',
    a: 'Tell us. Use Ask Us on a custom item, or contact support on WhatsApp, and we will see what we can arrange.',
  },
];

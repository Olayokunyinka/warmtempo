// Renders both emails with sample data to /tmp/email-ack.html and /tmp/email-notify.html
import fs from 'node:fs';
import { ackEmail, notifyEmail } from '../lib/emails.js';
const base = 'file://' + new URL('../public', import.meta.url).pathname;
const v = { firstName: 'Ada', lastName: 'Okafor', email: 'ada@example.com', phone: '+234 801 234 5678', whatsapp: '+234 801 234 5678', country: 'Nigeria', interest: 'Managed video production', platform: 'YouTube', type: 'Narrated stories', starting: 'Script', brief: 'I run a history channel and have 12 finished scripts. I would like voiceover and visuals for each, starting with the Songhai Empire video.' };
fs.writeFileSync('/tmp/email-ack.html', ackEmail(v, { base }).html);
fs.writeFileSync('/tmp/email-notify.html', notifyEmail(v, { id: 1, now: '2026-11-11T21:40:12.000Z', marketing: true, base }).html);

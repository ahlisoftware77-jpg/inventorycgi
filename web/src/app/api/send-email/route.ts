import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let smtp, to, subject, html, action;
    let mailAttachments: any[] = [];

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      smtp = JSON.parse(formData.get('smtp') as string);
      to = JSON.parse(formData.get('to') as string);
      subject = formData.get('subject') as string;
      html = formData.get('html') as string;
      action = formData.get('action') as string;

      for (const [key, value] of formData.entries()) {
        if (key.startsWith('attachment_') && typeof value === 'object' && 'arrayBuffer' in value) {
          const buffer = Buffer.from(await (value as Blob).arrayBuffer());
          mailAttachments.push({
            filename: (value as File).name,
            content: buffer,
            contentType: (value as File).type
          });
        }
      }
    } else {
      const body = await request.json();
      smtp = body.smtp;
      to = body.to;
      subject = body.subject;
      html = body.html;
      action = body.action;
    }

    let smtpHost, smtpPort, smtpSecure, smtpUser, smtpPass, smtpBcc, smtpSenderName, smtpSenderEmail;

    try {
      const { db } = await import('@/lib/firebase-admin');
      if (db) {
        try {
          const emailSettingsSnap = await db.collection('settings').doc('email').get();
          if (emailSettingsSnap.exists) {
            const data = emailSettingsSnap.data();
            if (data?.smtpProvider === 'custom') {
              smtpHost = data?.customHost;
              smtpPort = data?.customPort;
              smtpSecure = data?.customSecure;
              smtpUser = data?.customUser;
              smtpPass = data?.customPass;
              smtpSenderName = data?.customSenderName;
              smtpSenderEmail = data?.customSenderEmail;
            } else if (data?.smtpProvider === 'gmail') {
              smtpHost = 'smtp.gmail.com';
              smtpPort = 465;
              smtpSecure = true;
              smtpUser = data?.gmailUser;
              smtpPass = data?.gmailPass;
              smtpSenderName = data?.gmailSenderName;
              smtpSenderEmail = data?.gmailUser;
            } else {
              // Fallback to legacy structure
              smtpHost = data?.smtpHost;
              smtpPort = data?.smtpPort;
              smtpSecure = data?.smtpSecure;
              smtpUser = data?.smtpUser;
              smtpPass = data?.smtpPass;
              smtpBcc = data?.smtpBcc;
              smtpSenderName = data?.smtpSenderName;
              smtpSenderEmail = data?.smtpSenderEmail;
            }
          }
        } catch (fetchError: any) {
          return NextResponse.json({ error: 'Incomplete SMTP configuration provided.', details: 'Firestore fetch error: ' + fetchError.message }, { status: 400, headers: corsHeaders });
        }
      } else {
        return NextResponse.json({ error: 'Incomplete SMTP configuration provided.', details: 'Firebase Admin DB is null. Check FIREBASE_PRIVATE_KEY format on Vercel.' }, { status: 400, headers: corsHeaders });
      }
    } catch (e: any) {
      console.warn("Could not fetch smtp from db, falling back to payload:", e);
      return NextResponse.json({ error: 'Incomplete SMTP configuration provided.', details: 'Exception during Firebase Admin load: ' + e.message }, { status: 400, headers: corsHeaders });
    }

    // Fallback to client payload
    smtpHost = smtpHost || smtp?.host;
    smtpPort = smtpPort || smtp?.port;
    smtpSecure = smtpSecure !== undefined ? smtpSecure : smtp?.secure;
    smtpUser = smtpUser || smtp?.user;
    smtpPass = smtpPass || smtp?.pass;
    smtpBcc = smtpBcc || smtp?.bcc;
    smtpSenderName = smtpSenderName || smtp?.senderName;
    smtpSenderEmail = smtpSenderEmail || smtp?.senderEmail;

    if (!smtpHost || !smtpUser || !smtpPass) {
      return NextResponse.json({ error: 'Incomplete SMTP configuration provided.' }, { status: 400, headers: corsHeaders });
    }

    const port = Number(smtpPort) || 465;
    const isSecure = smtpSecure !== undefined ? Boolean(smtpSecure) : (port === 465);

    // Initialize nodemailer transporter
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: port,
      secure: isSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      tls: {
        rejectUnauthorized: false, // useful for custom SMTP with self-signed certs
      }
    });

    // If action is testConnection, return success here
    if (action === 'testConnection') {
      await transporter.verify();
      return NextResponse.json({ success: true, message: 'Koneksi SMTP berhasil.' }, { headers: corsHeaders });
    }

    if (!to || !Array.isArray(to) || to.length === 0) {
      return NextResponse.json({ error: 'No recipients provided.' }, { status: 400, headers: corsHeaders });
    }

    let bccList = smtpBcc || undefined;

    // Handle Base64 inline images for Gmail compatibility
    let finalHtml = html;
    const inlineAttachments: any[] = [];

    if (finalHtml) {
      let imgIndex = 0;
      finalHtml = finalHtml.replace(/<img([^>]+)src="data:(image\/[^;]+);base64,([^"]+)"([^>]*)>/g, (match, before, mimeType, base64Data, after) => {
        const cid = `inline_img_${imgIndex}_${Date.now()}@yadiapp`;

        inlineAttachments.push({
          filename: `image_${imgIndex}.${mimeType.split('/')[1]}`,
          content: Buffer.from(base64Data, 'base64'),
          cid: cid
        });

        imgIndex++;
        return `<img${before}src="cid:${cid}"${after}>`;
      });
    }

    const mailOptions: any = {
      from: { name: smtpSenderName || 'Admin', address: smtpSenderEmail || smtpUser },
      to: to.join(', '),
      bcc: bccList,
      subject: subject,
      html: finalHtml,
    };

    // Combine any user attachments with our inline base64 image attachments
    const allAttachments = [...(mailAttachments || []), ...inlineAttachments];
    if (allAttachments.length > 0) {
      mailOptions.attachments = allAttachments;
    }

    const info = await transporter.sendMail(mailOptions);

    return NextResponse.json({
      success: true,
      message: `Emails sent successfully to ${to.length} recipients.`,
      messageId: info.messageId
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('Error sending email:', error);
    return NextResponse.json({ error: 'Failed to send email', details: error.message }, { status: 500, headers: corsHeaders });
  }
}


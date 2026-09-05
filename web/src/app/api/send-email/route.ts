import { NextResponse } from 'next/server';
import { authenticateRequest, getCorsHeaders } from '@/lib/api-security';
import nodemailer from 'nodemailer';



export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 200, headers: getCorsHeaders(request) });
}

export async function POST(request: Request) {
  try {
    await authenticateRequest(request);
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

    if (!smtp || !smtp.host || !smtp.user || !smtp.pass) {
      return NextResponse.json({ error: 'Incomplete SMTP configuration provided.' }, { status: 400, headers: getCorsHeaders(request) });
    }

    const port = Number(smtp.port) || 465;
    const isSecure = smtp.secure !== undefined ? Boolean(smtp.secure) : (port === 465);

    // Initialize nodemailer transporter
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: port,
      secure: isSecure, 
      auth: {
        user: smtp.user,
        pass: smtp.pass,
      },
      tls: {
        rejectUnauthorized: false, // useful for custom SMTP with self-signed certs
      }
    });

    // If action is testConnection, return success here
    if (action === 'testConnection') {
      await transporter.verify();
      return NextResponse.json({ success: true, message: 'Koneksi SMTP berhasil.' }, { headers: getCorsHeaders(request) });
    }

    if (!to || !Array.isArray(to) || to.length === 0) {
      return NextResponse.json({ error: 'No recipients provided.' }, { status: 400, headers: getCorsHeaders(request) });
    }

    // Send emails (using bcc to hide recipient list from each other if multiple)
    let bccList = to.length > 1 ? to.join(', ') : '';
    if (smtp.bcc) {
      bccList = bccList ? `${bccList}, ${smtp.bcc}` : smtp.bcc;
    }

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
      from: { name: smtp.senderName || 'Admin', address: smtp.senderEmail || smtp.user },
      to: to.length === 1 ? to[0] : (smtp.senderEmail || smtp.user),
      bcc: bccList || undefined,
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
    }, { headers: getCorsHeaders(request) });

  } catch (error: any) {
    console.error('Error sending email:', error);
    return NextResponse.json({ error: 'Failed to send email', details: error.message }, { status: 500, headers: getCorsHeaders(request) });
  }
}

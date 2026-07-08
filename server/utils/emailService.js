const nodemailer = require('nodemailer');

const createTransporter = async () => {
  // If SMTP variables are missing, use a test Ethereal account
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.log('[INFO] No SMTP configuration found. Creating a test Ethereal account...');
    const testAccount = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: testAccount.user, // generated ethereal user
        pass: testAccount.pass, // generated ethereal password
      },
    });
  }

  // Use real SMTP config
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const sendWelcomeEmail = async (userEmail, fullName) => {
  try {
    const transporter = await createTransporter();

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f4f7f6;
            margin: 0;
            padding: 0;
            direction: rtl;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background-color: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.05);
            overflow: hidden;
            border-top: 5px solid #3b82f6;
          }
          .header {
            background-color: #3b82f6;
            color: #ffffff;
            text-align: center;
            padding: 30px 20px;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
          }
          .content {
            padding: 40px 30px;
            color: #333333;
            line-height: 1.6;
          }
          .content p {
            font-size: 16px;
            margin-bottom: 20px;
          }
          .accent-text {
            color: #f97316;
            font-weight: bold;
          }
          .footer {
            background-color: #f8fafc;
            padding: 20px;
            text-align: center;
            color: #64748b;
            font-size: 14px;
            border-top: 1px solid #e2e8f0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>مرحباً بك في نظام إدارة "مخصوص"</h1>
          </div>
          <div class="content">
            <p>أهلاً بك <strong>${fullName}</strong>،</p>
            <p>تم استلام طلب إنشاء حسابك بنجاح في النظام.</p>
            <p>حالة الحساب الحالية: <span class="accent-text">قيد المراجعة</span></p>
            <p>سوف يتم التواصل معك قريباً لتفعيل الحساب وإعطائك الصلاحيات اللازمة للبدء في استخدام لوحة التحكم.</p>
            <p>شكراً لتعاونكم،<br/>إدارة النظام</p>
          </div>
          <div class="footer">
            <p>هذه الرسالة تم توليدها تلقائياً، يرجى عدم الرد عليها.</p>
            <p>&copy; ${new Date().getFullYear()} Makhsoos. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const info = await transporter.sendMail({
      from: `Makhsoos Admin <${process.env.FROM_EMAIL || 'noreply@makhsoos.com'}>`,
      to: userEmail,
      subject: 'طلب إنشاء حساب جديد - نظام مخصوص',
      html: htmlContent,
    });

    console.log('[INFO] Welcome email sent: %s', info.messageId);
    
    if (!process.env.SMTP_HOST) {
      // Log preview URL for ethereal
      console.log('[INFO] Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
  } catch (error) {
    console.error('[ERROR] Failed to send welcome email:', error);
  }
};

const sendActivationEmail = async (userEmail, fullName, loginUrl) => {
  try {
    const transporter = await createTransporter();

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; margin: 0; padding: 0; direction: rtl; }
          .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); overflow: hidden; border-top: 5px solid #22c55e; }
          .header { background-color: #22c55e; color: #ffffff; text-align: center; padding: 30px 20px; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { padding: 40px 30px; color: #333333; line-height: 1.6; }
          .content p { font-size: 16px; margin-bottom: 20px; }
          .btn { display: inline-block; padding: 12px 30px; background-color: #22c55e; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; margin-top: 10px; }
          .footer { background-color: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 14px; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>تم تفعيل حسابك بنجاح 🎉</h1>
          </div>
          <div class="content">
            <p>أهلاً بك <strong>${fullName}</strong>،</p>
            <p>يسعدنا إخبارك بأنه تم تفعيل حسابك في نظام إدارة "مخصوص" من قبل الإدارة.</p>
            <p>يمكنك الآن تسجيل الدخول والبدء في استخدام لوحة التحكم وكافة الصلاحيات المتاحة لك.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}" class="btn">تسجيل الدخول للوحة التحكم</a>
            </div>
            <p>نتمنى لك تجربة ممتعة،<br/>إدارة النظام</p>
          </div>
          <div class="footer">
            <p>هذه الرسالة تم توليدها تلقائياً، يرجى عدم الرد عليها.</p>
            <p>&copy; ${new Date().getFullYear()} Makhsoos. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const info = await transporter.sendMail({
      from: `Makhsoos Admin <${process.env.FROM_EMAIL || 'noreply@makhsoos.com'}>`,
      to: userEmail,
      subject: 'تم تفعيل حسابك - نظام مخصوص',
      html: htmlContent,
    });

    console.log('[INFO] Activation email sent: %s', info.messageId);
    
    if (!process.env.SMTP_HOST) {
      console.log('[INFO] Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
  } catch (error) {
    console.error('[ERROR] Failed to send activation email:', error);
  }
};

const sendDayOffRequestEmail = async (adminEmails, employeeName, requestDate, dayName) => {
  try {
    const transporter = await createTransporter();
    
    // adminEmails can be an array or string
    const to = Array.isArray(adminEmails) ? adminEmails.join(',') : adminEmails;
    if (!to) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; margin: 0; padding: 0; direction: rtl; }
          .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); overflow: hidden; border-top: 5px solid #f59e0b; }
          .header { background-color: #f59e0b; color: #ffffff; text-align: center; padding: 30px 20px; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { padding: 40px 30px; color: #333333; line-height: 1.6; }
          .content p { font-size: 16px; margin-bottom: 20px; }
          .footer { background-color: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 14px; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>طلب إجازة جديد 📅</h1>
          </div>
          <div class="content">
            <p>مرحباً،</p>
            <p>لقد قام الموظف <strong>${employeeName}</strong> بتقديم طلب إجازة ليوم <strong>${dayName}</strong> الموافق <strong>${requestDate}</strong>.</p>
            <p>يرجى مراجعة لوحة تحكم الإجازات لاتخاذ الإجراء المناسب (موافقة / رفض).</p>
          </div>
          <div class="footer">
            <p>نظام إدارة مخصوص</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const info = await transporter.sendMail({
      from: `Makhsoos Admin <${process.env.FROM_EMAIL || 'noreply@makhsoos.com'}>`,
      to,
      subject: `طلب إجازة جديد من ${employeeName}`,
      html: htmlContent,
    });

    console.log('[INFO] DayOff Request email sent: %s', info.messageId);
  } catch (error) {
    console.error('[ERROR] Failed to send DayOff Request email:', error);
  }
};

const sendDayOffStatusEmail = async (employeeEmail, employeeName, requestDate, dayName, status) => {
  try {
    if (!employeeEmail) return;
    const transporter = await createTransporter();
    
    const isApproved = status === 'Approved';
    const color = isApproved ? '#22c55e' : '#ef4444';
    const statusText = isApproved ? 'تمت الموافقة على' : 'تم رفض';

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; margin: 0; padding: 0; direction: rtl; }
          .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); overflow: hidden; border-top: 5px solid ${color}; }
          .header { background-color: ${color}; color: #ffffff; text-align: center; padding: 30px 20px; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { padding: 40px 30px; color: #333333; line-height: 1.6; }
          .content p { font-size: 16px; margin-bottom: 20px; }
          .footer { background-color: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 14px; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>تحديث حالة طلب الإجازة</h1>
          </div>
          <div class="content">
            <p>أهلاً <strong>${employeeName}</strong>،</p>
            <p>نود إعلامك بأنه <strong>${statusText}</strong> طلب الإجازة الخاص بك ليوم <strong>${dayName}</strong> الموافق <strong>${requestDate}</strong>.</p>
            <p>شكراً لتعاونكم.</p>
          </div>
          <div class="footer">
            <p>نظام إدارة مخصوص</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const info = await transporter.sendMail({
      from: `Makhsoos Admin <${process.env.FROM_EMAIL || 'noreply@makhsoos.com'}>`,
      to: employeeEmail,
      subject: `تحديث حالة طلب الإجازة - ${requestDate}`,
      html: htmlContent,
    });

    console.log('[INFO] DayOff Status email sent: %s', info.messageId);
  } catch (error) {
    console.error('[ERROR] Failed to send DayOff Status email:', error);
  }
};

module.exports = {
  sendWelcomeEmail,
  sendActivationEmail,
  sendDayOffRequestEmail,
  sendDayOffStatusEmail
};

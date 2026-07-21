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
      <body dir="rtl" style="direction: rtl; text-align: right;">
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
      <body dir="rtl" style="direction: rtl; text-align: right;">
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
      <body dir="rtl" style="direction: rtl; text-align: right;">
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
      <body dir="rtl" style="direction: rtl; text-align: right;">
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

const sendSettlementEmail = async (adminUser, accountDetails, monthKey) => {
  if (!accountDetails.employeeEmail) return; // No email to send to

  try {
    const transporter = await createTransporter();
    
    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; margin: 0; padding: 20px; color: #1f2937; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); border: 1px solid #e5e7eb; }
          .header { background-color: #10b981; color: white; padding: 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; font-weight: bold; }
          .content { padding: 30px; }
          .greeting { font-size: 18px; margin-bottom: 20px; font-weight: bold; color: #111827; }
          .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 25px; }
          .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
          .info-row:last-child { border-bottom: none; }
          .info-label { color: #64748b; font-weight: bold; }
          .info-value { color: #0f172a; font-weight: bold; text-align: right; }
          .amount-highlight { background-color: #ecfdf5; border: 1px solid #10b981; color: #047857; padding: 15px; border-radius: 12px; text-align: center; font-size: 20px; font-weight: bold; margin-bottom: 25px; }
          .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 14px; color: #64748b; border-top: 1px solid #e2e8f0; }
          .negative { color: #ef4444; }
          .positive { color: #10b981; }
        </style>
      </head>
      <body dir="rtl" style="direction: rtl; text-align: right;">
        <div class="container">
          <div class="header">
            <h1>إشعار تسوية مالية لحسابك</h1>
          </div>
          <div class="content">
            <p class="greeting">مرحباً ${accountDetails.employeeName}،</p>
            <p>نود إعلامك بأنه تم إصدار تسوية مالية لحسابك عن شهر <strong>${monthKey}</strong>.</p>
            
            <div class="amount-highlight">
              المبلغ المستحق النهائي: ${accountDetails.netSalary} ج.م
            </div>

            <h3 style="color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 15px;">تفاصيل الحساب</h3>
            <div class="info-box">
              <div class="info-row">
                <span class="info-label">أيام الحضور (الراتب الأساسي):</span>
                <span class="info-value">${accountDetails.baseEarnings} ج.م <br/><span style="font-size: 12px; font-weight: normal; color: #64748b;">(حضور: ${accountDetails.presentCount}، إجازة: ${accountDetails.dayOffCount})</span></span>
              </div>
              <div class="info-row">
                <span class="info-label">إجمالي الإضافات:</span>
                <span class="info-value positive">+${accountDetails.totalAdditions} ج.م</span>
              </div>
              <div class="info-row">
                <span class="info-label">إجمالي الخصومات:</span>
                <span class="info-value negative">-${accountDetails.totalDeductions} ج.م <br/><span style="font-size: 12px; font-weight: normal; color: #64748b;">(أيام غياب: ${accountDetails.absentCount})</span></span>
              </div>
              <div class="info-row">
                <span class="info-label">السلف المستردة:</span>
                <span class="info-value negative">-${accountDetails.totalAdvances} ج.م</span>
              </div>
            </div>

            <h3 style="color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 15px;">معلومات التحويل</h3>
            <div class="info-box">
              <div class="info-row">
                <span class="info-label">طريقة الدفع:</span>
                <span class="info-value">${accountDetails.walletType === 'InstaPay' ? 'انستا باي (InstaPay)' : (accountDetails.walletType === 'E-Wallet' ? 'محفظة إلكترونية' : accountDetails.walletType)}</span>
              </div>
              <div class="info-row">
                <span class="info-label">رقم الحساب / المحفظة:</span>
                <span class="info-value" dir="ltr">${accountDetails.walletNumber}</span>
              </div>
              <div class="info-row">
                <span class="info-label">بواسطة (المسؤول):</span>
                <span class="info-value">${adminUser.fullName || adminUser.username}</span>
              </div>
              <div class="info-row">
                <span class="info-label">تاريخ التسوية:</span>
                <span class="info-value" dir="ltr">${new Date().toLocaleDateString('en-GB')}</span>
              </div>
            </div>
            
            <p style="color: #64748b; font-size: 14px; margin-top: 20px;">
              يرجى التحقق من محفظتك الإلكترونية أو حسابك البنكي للتأكد من وصول المبلغ. في حال وجود أي استفسار يرجى مراجعة الإدارة.
            </p>
          </div>
          <div class="footer">
            هذه رسالة تلقائية من نظام إدارة الموظفين (Makhsoos). الرجاء عدم الرد عليها.
          </div>
        </div>
      </body>
      </html>
    `;

    const info = await transporter.sendMail({
      from: `Makhsoos Admin <${process.env.FROM_EMAIL || 'noreply@makhsoos.com'}>`,
      to: accountDetails.employeeEmail,
      subject: `إشعار تسوية مالية - ${monthKey}`,
      html: htmlContent,
    });

    console.log('[INFO] Settlement email sent: %s', info.messageId);
  } catch (error) {
    console.error('[ERROR] Failed to send Settlement email:', error);
  }
};

module.exports = {
  sendWelcomeEmail,
  sendActivationEmail,
  sendDayOffRequestEmail,
  sendDayOffStatusEmail,
  sendSettlementEmail
};

using System;
using System.Net;
using System.Net.Mail;
using System.Threading.Tasks;

namespace Beauty.Services
{
    public class EmailService
    {
        // НАСТРОЙКА SMTP СЕРВЕРА 
        private readonly string _smtpServer = "smtp.mail.ru"; // Если Яндекс: smtp.yandex.ru
        private readonly int _smtpPort = 587; // Для SSL/TLS обычно 587 или 465
        private readonly string _fromEmail = "beauty_hub_crm@mail.ru"; // Твоя техническая почта

        // ВАЖНО: Это  специальный "Пароль для внешних приложений", созданный в настройках безопасности почты!
        private readonly string _appPassword = "yWI1VKHvmQmWW81feMCo";

        public async Task SendBookingConfirmationAsync(string toEmail, string clientName, string salonName, string masterName, string serviceName, DateTime appointmentTime, string salonAddress)
        {
            try
            {
                var mailMessage = new MailMessage
                {
                    From = new MailAddress(_fromEmail, "BEAUTY HUB CRM"),
                    Subject = "🌟 Подтверждение вашей онлайн-записи на бьюти-процедуру!",
                    Body = $@"
                        <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 2px solid #fef3c7; border-radius: 16px; background-color: #fffbeb;'>
                            <h2 style='color: #d97706; text-align: center;'>Преображение ждет вас! ✨</h2>
                            <p style='font-size: 16px; color: #451a03;'>Здравствуйте, <b>{clientName}</b>!</p>
                            <p style='font-size: 15px; color: #78350f;'>Вы успешно записались на бьюти-услугу через платформу BEAUTY HUB. Вот детали вашего предстоящего визита:</p>
                            
                            <table style='width: 100%; border-collapse: collapse; margin: 20px 0; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(217,119,6,0.03);'>
                                <tr style='background: #fef3c7; color: #451a03; font-weight: bold;'>
                                    <td colspan='2' style='padding: 12px; text-align: center;'>📋 ДЕТАЛИ ВИЗИТА</td>
                                </tr>
                                <tr>
                                    <td style='padding: 12px; border-bottom: 1px solid #fef3c7; color: #78350f;'>🏢 <b>Салон красоты:</b></td>
                                    <td style='padding: 12px; border-bottom: 1px solid #fef3c7; color: #451a03;'>{salonName}</td>
                                </tr>
                                <tr>
                                    <td style='padding: 12px; border-bottom: 1px solid #fef3c7; color: #78350f;'>📍 <b>Адрес филиала:</b></td>
                                    <td style='padding: 12px; border-bottom: 1px solid #fef3c7; color: #451a03;'>{salonAddress}</td>
                                </tr>
                                <tr>
                                    <td style='padding: 12px; border-bottom: 1px solid #fef3c7; color: #78350f;'>💇 <b>Специалист:</b></td>
                                    <td style='padding: 12px; border-bottom: 1px solid #fef3c7; color: #451a03;'>{masterName}</td>
                                </tr>
                                <tr>
                                    <td style='padding: 12px; border-bottom: 1px solid #fef3c7; color: #78350f;'>✨ <b>Бьюти-процедура:</b></td>
                                    <td style='padding: 12px; border-bottom: 1px solid #fef3c7; color: #451a03;'>{serviceName}</td>
                                </tr>
                                <tr>
                                    <td style='padding: 12px; color: #78350f;'>📅 <b>Дата и время:</b></td>
                                    <td style='padding: 12px; color: #451a03; font-weight: bold;'>{appointmentTime.ToString("dd.MM.yyyy HH:mm")}</td>
                                </tr>
                            </table>

                            <p style='font-size: 13px; color: #92400e; text-align: center; margin-top: 25px;'>Если ваши планы изменятся, вы можете отменить или перенести визит в вашем Личном кабинете.<br>Спасибо, что выбираете нас! ❤️</p>
                        </div>",
                    IsBodyHtml = true // Включаем сочную HTML-верстку письма!
                };

                mailMessage.To.Add(toEmail);

                using (var smtpClient = new SmtpClient(_smtpServer, _smtpPort))
                {
                    smtpClient.Credentials = new NetworkCredential(_fromEmail, _appPassword);
                    smtpClient.EnableSsl = true; // Обязательно включаем шифрование SSL/TLS
                    await smtpClient.SendMailAsync(mailMessage);
                }

                Console.WriteLine($"[CRM EMAIL] Уведомление о записи успешно отправлено на {toEmail}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRM EMAIL ERROR] Не удалось отправить письмо: {ex.Message}");
            }
        }

        public async Task SendPasswordResetLinkAsync(string toEmail, string clientName, string resetToken)
        {
            try
            {
                // Формируем прямую ссылку на будущую страницу сброса пароля в React
                string resetLink = $"http://localhost:5173/reset-password?token={resetToken}";

                var mailMessage = new MailMessage
                {
                    From = new MailAddress(_fromEmail, "BEAUTY HUB CRM"),
                    Subject = "🔒 Восстановление доступа к Личному кабинету BEAUTY HUB",
                    Body = $@"
                        <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 2px solid #fef3c7; border-radius: 16px; background-color: #fffbeb;'>
                            <h2 style='color: #d97706; text-align: center;'>Сброс пароля ✨</h2>
                            <p style='font-size: 16px; color: #451a03;'>Здравствуйте, <b>{clientName}</b>!</p>
                            <p style='font-size: 15px; color: #78350f;'>Вы получили это письмо, так как запросили восстановление пароля от своего Личного кабинета на бьюти-платформе BEAUTY HUB.</p>
                            
                            <div style='text-align: center; margin: 30px 0;'>
                                <p style='font-size: 14px; color: #78350f; margin-bottom: 15px;'>Для установки нового пароля нажмите на кнопку ниже:</p>
                                <a href='{resetLink}' target='_blank' style='background-color: #faad14; color: #fff; padding: 12px 30px; font-size: 15px; font-weight: bold; text-decoration: none; border-radius: 8px; box-shadow: 0 4px 12px rgba(250,173,20,0.3); display: inline-block;'>
                                    Восстановить пароль
                                </a>
                            </div>

                            <p style='font-size: 12px; color: #92400e; text-align: center; margin-top: 25px;'>
                                Ссылка действительна в течение 15 минут. Если кнопка выше не работает, скопируйте и вставьте эту ссылку в адресную строку браузера:<br>
                                <a href='{resetLink}' style='color: #2563eb;'>{resetLink}</a>
                            </p>
                        </div>",
                    IsBodyHtml = true
                };

                mailMessage.To.Add(toEmail);

                using (var smtpClient = new SmtpClient(_smtpServer, _smtpPort))
                {
                    smtpClient.Credentials = new NetworkCredential(_fromEmail, _appPassword);
                    smtpClient.EnableSsl = true;
                    await smtpClient.SendMailAsync(mailMessage);
                }

                Console.WriteLine($"[CRM EMAIL] Ссылка сброса пароля успешно отправлена на {toEmail}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRM EMAIL ERROR] Не удалось отправить ссылку сброса: {ex.Message}");
            }
        }



    }
}

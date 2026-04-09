/**
 * Gửi email xác nhận (tuỳ chọn). Cấu hình RESEND_API_KEY + RESEND_FROM_EMAIL.
 * Không có key thì bỏ qua — không làm fail luồng nộp bài.
 */
export async function sendMockSkillConfirmationEmail(to: string, params: { examTitle: string }): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim() || "onboarding@resend.dev";
  if (!apiKey) return;

  const subject = `Đã nhận bài thi thử — ${params.examTitle}`;
  const html = `
    <p>Xin chào,</p>
    <p>Hệ thống đã nhận bài thi thử của bạn: <strong>${escapeHtml(params.examTitle)}</strong>.</p>
    <p>Kết quả chi tiết sẽ được gửi tới email này trong vài giờ làm việc. Vui lòng kiểm tra cả hộp thư Spam.</p>
    <p>Trân trọng.</p>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.warn("[mock-skill] Resend failed:", res.status, text);
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

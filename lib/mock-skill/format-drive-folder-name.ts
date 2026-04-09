/**
 * Tên thư mục trên Drive: "Họ tên - email - thời gian" (giờ VN) + mã ngắn để tránh trùng tên.
 * Ký tự không hợp lệ trên nhiều hệ thống được thay bằng "-".
 */
export function formatDriveSubmissionFolderName(
  fullName: string,
  email: string,
  submittedAt: Date,
  submissionId: string
): string {
  const strip = (s: string, max: number) =>
    s
      .replace(/[/\\:*?"<>|]/g, "-")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, max);

  const namePart = strip(fullName, 100) || "Thi-sinh";
  const emailPart = strip(email.toLowerCase(), 100) || "email";

  const wallclock = submittedAt
    .toLocaleString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" })
    .replace(" ", "_")
    .replace(/:/g, "-");

  const idShort = submissionId.replace(/-/g, "").slice(0, 8);
  const base = `${namePart} - ${emailPart} - ${wallclock}`;
  const maxLen = 220;
  const body = base.length > maxLen ? `${base.slice(0, maxLen - 10)}…` : base;
  return `${body} [${idShort}]`;
}

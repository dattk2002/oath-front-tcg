import { useContext } from "react";
import { SessionRecoveryContext } from "./private-storage";
export default function SessionRecovery({
  online = true,
}: {
  online?: boolean;
}) {
  const expired = useContext(SessionRecoveryContext);
  if (!expired) return null;
  return (
    <div className="session-recovery">
      <p>
        Phiên đã hết hạn. Khôi phục rồi thử lại; yêu cầu đang giữ không thay
        đổi.
      </p>
      <button
        disabled={!online}
        onClick={() => window.dispatchEvent(new Event("oathfront:renew"))}
      >
        Khôi phục phiên
      </button>
      <button
        disabled={!online}
        onClick={() => window.dispatchEvent(new Event("oathfront:login"))}
      >
        Đăng nhập Google
      </button>
    </div>
  );
}

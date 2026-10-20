import Link from "next/link";
export const routes = {
  home: "/",
  heroes: "/heroes",
  match: (id: string) => `/matches/${encodeURIComponent(id)}`,
};
export function Brand() {
  return (
    <Link className="brand" href={routes.home}>
      <span className="brand-mark" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
      </span>
      <span>
        OATHFRONT <small>NGŨ LỘ</small>
        <span className="sr-only"> · Trang chủ</span>
      </span>
    </Link>
  );
}

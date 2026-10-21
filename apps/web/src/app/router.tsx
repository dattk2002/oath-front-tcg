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
        OATHFRONT <small>THE FIVEFOLD</small>
        <span className="sr-only"> · Home</span>
      </span>
    </Link>
  );
}

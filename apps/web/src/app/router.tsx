import Link from "next/link";
export const routes = {
  home: "/",
  heroes: "/heroes",
  match: (id: string) => `/matches/${encodeURIComponent(id)}`,
};
export function Brand() {
  return (
    <Link className="brand" href={routes.home} aria-label="OathFront · Home">
      <img
        src="/assets/pen-v1/logo-light.svg"
        alt="OathFront"
        width="144"
        height="52"
      />
    </Link>
  );
}

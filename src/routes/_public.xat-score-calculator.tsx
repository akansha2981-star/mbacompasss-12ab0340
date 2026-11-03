import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/_public/xat-score-calculator")({
  beforeLoad: ({ location }) => { throw redirect({ href: `/tools/xat-score-calculator${location.searchStr}`, statusCode: 301 }); },
});

export const dynamic = 'force-dynamic'
export function GET() {
  return Response.json({ app: 'stats-master', status: 'ok' }, {
    headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' },
  })
}

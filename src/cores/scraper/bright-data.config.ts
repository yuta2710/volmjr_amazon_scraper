const username = String(process.env.BRIGHT_DATA_USERNAME)
const password = String(process.env.BRIGHT_DATA_PASSWORD)
const port = 22225
const host = String(process.env.BRIGHT_DATA_HOST)
const session_id = (1000000 * Math.random()) | 0;
var user_agent = 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36';

const options = {
  auth: {
    username: `brd-customer-hl_a15a94a1-zone-residential_proxy_1-country-um-route_err-pass_dyn-session-${session_id}`,
    password: 'sswkque95mnp'
  },
  host,
  port,
  rejectUnauthorized: false,
  headers: {'User-Agent': user_agent}
}

export default options;
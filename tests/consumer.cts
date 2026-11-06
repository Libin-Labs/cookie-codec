import api = require('@lp-labs/cookie-codec');
const result = api.parseSetCookie('id=1; HttpOnly');
const name: string = result.name;
void name;

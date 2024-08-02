## api
A library that makes communicating with the [Blacket](https://blacket.org) API easier. This does not include WebSocket support for features such as the chat, trading, and live notifications.
> While this implementation supports proxies, it uses Bun's native proxy support with the fetch API. This means that the implementation will not natively work with other runtimes.

## Usage
```js
import v1 from 'api';

const token = 'your-token';

// Get the user's profile/statistics
const user_res = await v1.user(token);
if(user_res.error) throw new Error(user_res.reason);
const user = user_res.user;

// Get bazaar listings for 'Snowman' blook &
// List your own 'Snowman' for 1 token less
const bazaar = new v1.bazaar(token);
const listings_res = await bazaar.search('Snowman');
if(listings_res.error) throw new Error(listings_res.reason);
const listings = listings_res.bazaar.filter(listing => listing.item === 'Snowman');
const cheapest = listings[0];
if(!cheapest) throw new Error('No listings found for `Snowman`.');
const list_res = await bazaar.list('Snowman', cheapest.price - 1);
if(list_res.error) throw new Error(list_res.reason);

// Using proxies
const proxy = 'your-proxy';
// Using proxy with a single API call
const user_resp = await v1.user(token, proxy);
// Using proxy with an API instance and all subsequent calls
const bazaarp = new v1.bazaar(token, proxy);
// Using a proxy with a single API call on an instance
// Proxy will be used once on the next API call and then reset
// The 'once' proxy will override the instance proxy
const listings_resp = await bazaarp.once(proxy).search('Snowman');
```
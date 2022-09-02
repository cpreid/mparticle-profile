# Node Client for mParticle's Profile
Allow this node client to manage auth token refreshes & abstract calls for MPID lookups, exposing a single method `ProfileClient.getProfile(identities={})` that fetches a [customer profile from mParticle](https://docs.mparticle.com/developers/profile-api/#sample-response).

## Install via npm
```sh
$ npm install mparticle-profile
```
 
## Usage 
```
const MPProfile = require('mparticle-profile');
const MPProfileInstance = new MPProfile(); // see below for args

// somewhere in an async function
const profile = await MPProfileInstance.getProfile({email: "user@demo.com"});

```

### Constructor args
Either explicitly pass in your mP API credentials and identifiers or let the client read them from `env` vars.
```
constructor(args={
  identity_input_key       : process.env.mp_identity_input_key, 
  identity_input_secret    : process.env.mp_identity_input_secret, 
  profile_bearer_token     : process.env.mp_profile_bearer_token, 
  profile_api_client_id    : process.env.mp_profile_api_client_id, 
  profile_api_client_secret: process.env.mp_profile_api_client_secret, 
  org_id                   : process.env.mp_org_id, 
  acct_id                  : process.env.mp_acct_id, 
  workspace_id             : process.env.mp_workspace_id
})
```    

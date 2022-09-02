const axios = require('axios');

const PROFILE_API_URL = 'https://api.mparticle.com/userprofile/v1';
const IDENTITY_API_URL = 'https://identity.mparticle.com/v1/search';
const OAUTH_URL = 'https://sso.auth.mparticle.com/oauth/token';

class MPProfileMissingArgsError extends Error {}
class MPProfileOAuthWrongClientSecret extends Error {}

class MPProfile {

    /**
     * 
     * @param {Object} args 
     * All class properties default to environment variable values
     */
    constructor(args={
        identity_input_key       : process.env.mp_identity_input_key, 
        identity_input_secret    : process.env.mp_identity_input_secret, 
        profile_bearer_token     : process.env.mp_profile_bearer_token, 
        profile_api_client_id    : process.env.mp_profile_api_client_id, 
        profile_api_client_secret: process.env.mp_profile_api_client_secret, 
        org_id                   : process.env.mp_org_id, 
        acct_id                  : process.env.mp_acct_id, 
        workspace_id             : process.env.mp_workspace_id
    }) {
        this.validateArgs(args);
        Object.assign(this, args);             
        // if no profile bearer token is supplied, auto-refresh the token
        // Token expires every 8 hours (https://docs.mparticle.com/developers/profile-api/#using-your-bearer-token)
        if(!this.profile_bearer_token) this.refreshBearerToken();
    }

    validateArgs(args) {
        const missingArgs = [];
        for(const arg in args) {
            if(arg === 'profile_bearer_token') { }
            else if(!args[arg] || args[arg] == '') missingArgs.push(arg);
        }
        if(missingArgs.length) throw new MPProfileMissingArgsError(`You are missing the following MPProfile arguments: ${missingArgs.join(', ')}`);
    }

    async refreshBearerToken() {
        try {
            const resp = await axios.post(OAUTH_URL, {
                "client_id": this.profile_api_client_id,
                "client_secret": this.profile_api_client_secret,
                "audience": "https://api.mparticle.com",
                "grant_type": "client_credentials",
            });
            if(resp.data.access_token) {
                console.debug('Refreshing profile_bearer_token');
                this.profile_bearer_token = resp.data.access_token;
            }

        } catch(err) {
            throw new MPProfileOAuthWrongClientSecret('Unable to refresh bearer token, please check Profile API client ID and secret');
        }
    }

    async getProfileFromMpId(mpId, idOverrides={}, isRetry=false) {
        const coalescedIds = {'org_id': this.org_id, 'acct_id': this.acct_id, 'workspace_id': this.workspace_id, ...idOverrides};
        const url = `${PROFILE_API_URL}/${coalescedIds.org_id}/${coalescedIds.acct_id}/${coalescedIds.workspace_id}/${mpId}?fields=user_identities,user_attributes,audience_memberships,attribution`;
        let profile = {};
        try {
            const resp = await axios.get(url, {headers: {
                'Authorization': `Bearer ${this.profile_bearer_token}`
            }});
            profile = resp.data;
        } catch(err) {
            /**
             * On unauthorized response, attempt oauth exchange for bearer and persist it to client   
             * Then retry the profile request         
             */            
            if(!isRetry && err.response.status === 401) {
                await this.refreshBearerToken();
                return this.getProfileFromMpId(mpId, idOverrides, isRetry=true);
            }
        }        
        return profile;
    }
    
    async getMpId (identities={}, env='development') {        
        let resp, mpid;
        try {
            resp = await axios.post(IDENTITY_API_URL, {
                "environment": env,
                "known_identities": identities,  
            }, {
                auth: {
                    username: this.identity_input_key,
                    password: this.identity_input_secret,
                }
            });
            mpid = resp.data.mpid;
        } catch(err) {
            console.error(`Error getting mpid given identities: ${JSON.stringify(identities)}`);
        }    
        return mpid;
    }    

    async getProfile(identities={}, idOverrides={}, env='development') {
        /**
         * Can implement a caching layer here (ie redis or node-cache)
         * and return profile from cache or query mP on cache-miss 
         */
        const mpid = await this.getMpId(identities, env);
        let profile = {};
        try {
            profile = await this.getProfileFromMpId(mpid, idOverrides);        
        } catch(err) {
            console.error('Error occurred when getting profile', err);
        }
        return profile;
    }

}

module.exports = MPProfile;

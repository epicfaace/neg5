import jwt from 'jwt-simple';
import configuration from '../config/configuration';

const secret = configuration.jwt.secret;

export let encode = (payload) => {
    return jwt.encode(payload, secret);
}
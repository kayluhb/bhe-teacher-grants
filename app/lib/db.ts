import {env} from 'cloudflare:workers';

export const getDb = () => env.DB;

export const newId = (): string => crypto.randomUUID().replaceAll('-', '');

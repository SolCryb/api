import Redis from 'ioredis'
import { URL } from 'url'

interface ISentinel {
	host: string
	port: number
}


/**
 * Parse sentinals converts an array of sentinal URIs 
 * that look like ``redis://localhost:6379,redis://127.0.0.1:6379``
 * into an array of ISentinel object.
 * @param {string} sentinels sentinal URIs
 */
const parseSentinels = (sentinels: string): ISentinel[] => {
	return sentinels.split(',').map(uri => ({
		host: uri.split(':')[1].replace('//', ''),
		port: parseInt(uri.split(':')[2])
	}) as ISentinel) 
}

/**
 * getOptions creates a Redis Options object for creating the redis connections
 */
const getOptions = () => {
	if (!process.env.REDIS_URI && !process.env.REDIS_SENTINELS)
		throw new Error('No value was found for REDIS_URI or REDIS_SENTINELS - make sure .env is setup correctly!')

	if (process.env.REDIS_SENTINELS)
		return {
			sentinels: parseSentinels(process.env.REDIS_SENTINELS),
			name: 'mymaster'
		} as Redis.RedisOptions

	if (process.env.REDIS_URI) {
		const uri = new URL(process.env.REDIS_URI)

		return {
			host: uri.hostname || 'localhost',
			port: parseInt(uri.port) || 6379,
			db: parseInt(uri.pathname) || 0,
			password: uri.password ? decodeURIComponent(uri.password) : null
		} as Redis.RedisOptions
	}
}

export const createPubSubClient = () => new Redis(getOptions())

export default new Redis(getOptions())

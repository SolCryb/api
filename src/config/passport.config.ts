import axios from 'axios'
import passport from 'passport'
import { Strategy, ExtractJwt } from 'passport-jwt'
import { Request, Response, NextFunction } from 'express'
import User from '../models/user'


import { handleError, UserNoAuth, UserBanned } from '../utils/errors.utils'

passport.serializeUser((user, done) => done(null, user))
passport.deserializeUser((id, done) => done(null, id))

passport.use(new Strategy({
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_KEY
}, async ({ id }, done) => {
    try {
        const user = await new User().load(id)

        return done(null, user)
    } catch(error) {
        done(error)
    }
}))

const BAN_SAFE_ENDPOINTS = [
    'GET /user/me'
]

const fetchEndpoint = (req: Request) => `${req.method} ${req.baseUrl}${req.route.path}`

const fetchUser = async (req: Request, res: Response, next: NextFunction) => new Promise<User>(async (resolve, reject) => {
    try {
        if(process.env.AUTH_BASE_URL) {
            const { authorization } = req.headers,
                    token = authorization.split(' ')[1],
                    { data } = await axios.post(process.env.AUTH_BASE_URL, { token }),
                    user = new User(data)

            resolve(user)
        } else {
            passport.authenticate('jwt', { session: false }, async (err, user: User) => {
                if(err) return res.sendStatus(500)
                if(!user) return handleError(UserNoAuth, res)

                resolve(user)
            })(req, res, next)
        }
    } catch(error) {
        reject(error)
    }
})

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = await fetchUser(req, res, next),
                endpoint = fetchEndpoint(req),
                ban = await user.fetchBan()

        if(ban && BAN_SAFE_ENDPOINTS.indexOf(endpoint) > -1)
            return handleError(UserBanned, res)

        if(req.baseUrl === '/admin' && user.roles.indexOf('admin') === -1)
            return handleError(UserNoAuth, res)

        req.user = user

        next()
    } catch(error) {
        handleError(error, res)
    }
}

export default passport

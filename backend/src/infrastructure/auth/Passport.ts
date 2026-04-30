import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { UserRepository } from '../database/repositories/UserRepository.js';
import { PasswordService } from '../../core/services/PasswordService.js';
import logger from '../logging/logger.js';

const userRepository = new UserRepository();

export const initPassport = () => {
    passport.use(
        new LocalStrategy(
            { usernameField: 'email' },
            async (email, password, done) => {
                try {
                    const user = await userRepository.findByEmail(email);
                    if (!user) {
                        return done(null, false, { message: 'Invalid email or password' });
                    }

                    const isValid = await PasswordService.compare(password, user.passwordHash);
                    if (!isValid) {
                        return done(null, false, { message: 'Invalid email or password' });
                    }

                    if (user.status !== 'active') {
                        return done(null, false, { message: 'Account is not active' });
                    }

                    return done(null, user);
                } catch (error) {
                    logger.error('Authentication Error', error);
                    return done(error);
                }
            }
        )
    );

    passport.serializeUser((user: any, done) => {
        done(null, user.id);
    });

    passport.deserializeUser(async (id: number, done) => {
        try {
            const user = await userRepository.findById(id);
            done(null, user);
        } catch (error) {
            done(error);
        }
    });
};

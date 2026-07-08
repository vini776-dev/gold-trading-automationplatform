const COOKIE_NAME = 'gtap_token';

const getCookieOptions = () => {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  };
};

const getSessionCookieOptions = () => {
  return {
    ...getCookieOptions(),
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  };
};

module.exports = {
  COOKIE_NAME,
  getCookieOptions,
  getSessionCookieOptions,
};

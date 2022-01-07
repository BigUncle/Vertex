const logger = require('../libs/logger');
const UserMod = require('../model/UserMod');

const userMod = new UserMod();

class User {
  async login (req, res) {
    const options = req.query;
    try {
      const r = userMod.login(options);
      req.session.user = r;
      logger.info('登录成功, IP:', req.userIp);
      res.send({
        success: true
      });
    } catch (e) {
      logger.error(e);
      logger.error('登录失败, IP:', req.userIp);
      res.send({
        success: false,
        message: e
      });
    }
  };
}
module.exports = User;
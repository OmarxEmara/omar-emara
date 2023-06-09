const db = require('../../connectors/db');
const roles = require('../../constants/roles');
const { getSessionToken } = require('../../utils/session');

const getUser = async function(req) {
  const sessionToken = getSessionToken(req);
  if (!sessionToken) {
    return res.status(301).redirect('/');
  }

  const user = await db.select('*')
    .from('se_project.sessions')
    .where('token', sessionToken)
    .innerJoin('se_project.users', 'se_project.sessions.userid', 'se_project.users.id')
    .innerJoin('se_project.roles', 'se_project.users.roleid', 'se_project.roles.id')
    .first();
  
  console.log('user =>', user)
  user.isStudent = user.roleid === roles.student;
  user.isAdmin = user.roleid === roles.admin;
  user.isSenior = user.roleid === roles.senior;

  return user;  
}

module.exports = function(app) {
  // Register HTTP endpoint to render /users page
  app.get('/dashboard', async function(req, res) {
    const user = await getUser(req);
    return res.render('dashboard', user);
  });

  // Register HTTP endpoint to render /users page
  app.get('/users', async function(req, res) {
    const users = await db.select('*').from('se_project.users');
    return res.render('users', { users });
  });

  // Register HTTP endpoint to render /courses page
  app.get('/createstations', async function(req, res) {
    const admin = await getAdmin(req);
    const stations = await db.select('*').from('se_project.stations');
    return res.render('createstations', { admin, stations });
  });
  
  app.get('/createroute', async function(req, res) {
    const user = await getUser(req);
    const routes = await db.select('*').from('se_project.routes');
    return res.render('createroute', { user, routes });
  });

  app.get('/editroute', async function(req, res) {
    const user = await getUser(req);
    const routes = await db.select('*').from('se_project.routes');
    return res.render('editroute', { user, routes });
  });

  app.get('editstation', async function(req, res) {
    const user = await getUser(req);
    const stations = await db.select('*').from('se_project.stations');
    return res.render('editstation', { user, stations });
  });

  app.get('/managerefunds', async function(req, res) {
    const user = await getUser(req);
    const refunds = await db.select('*').from('se_project.refund_requests');
    return res.render('managerefunds', { user, refunds });
  });

  app.get('/manageseniorrequest', async function(req, res) {
    const user = await getUser(req);
    const seniorrequest = await db.select('*').from('se_project.senior_requests');
    return res.render('manageseniorrequest', { user, seniorrequest });
  });

  app.get('/managezone', async function(req, res) {
    const user = await getUser(req);
    const managezone = await db.select('*').from('se_project.zones');
    return res.render('managezone', { user, managezone });
  });

  app.get('/seniorrequest', async function(req, res) {
    const user = await getUser(req);
    const seniorrequest = await db.select('*').from('se_project.senior_requests');
    return res.render('seniorrequest', { user, seniorrequest });
  });

  app.get('/purchasesubscription', async function(req, res) {
    const user = await getUser(req);
    const purchasesubscription = await db.select('*').from('se_project.subsription');
    return res.render('purchasesubscription', { user, purchasesubscription });
  });

  app.get('/refundrequest', async function(req, res) {
    const user = await getUser(req);
    const refundrequest = await db.select('*').from('se_project.refund_requests');
    return res.render('refundrequest', { user, refundrequest });
  });

  app.get('/purchaseticket', async function(req, res) {
    const user = await getUser(req);
    const purchaseticket = await db.select('*').from('se_project.transactions');
    return res.render('purchaseticket', { user, purchaseticket });
  });

  app.get('/index', async function(req, res) {
    const users = await db.select('*').from('se_project.users');
    return res.render('index', { users });
  });

  app.get('/UserPage', async function(req, res) {
    const users = await db.select('*').from('se_project.users');
    return res.render('UserPage', { users });
  });

  app.get('/adminPage', async function(req, res) {
    const admin = await db.select('*').from('se_project.users');
    return res.render('AdminPage', { admin });
  });

  app.get('/register', async function(req, res) {
    const users = await db.select('*').from('se_project.users');
    return res.render('register', { users });
  });


  
};
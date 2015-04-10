/**
 * Server.js
 */
 
 
/* Librerias necesarias para la aplicación */
var bodyParser  = require('body-parser');
var express     = require('express');
var app         = express();
var http        = require('http').Server(app);
var io          = require('socket.io')(http);
var MongoClient = require('mongodb').MongoClient;
var userDAO     = require('./dao/UserDAO').UserDAO;
  
/** *** *** ***
 *  Configuramos el sistema de ruteo para las peticiones web:
 */
  
var host = process.env.VCAP_APP_HOST || 'localhost';
var port = process.env.VCAP_APP_PORT || 1337;

// Para acceder a los parametros de las peticiones POST
app.use(bodyParser.urlencoded({ extended: true }));

//Configuracion MongoDB //

if (process.env.VCAP_SERVICES) {
  var env = JSON.parse(process.env.VCAP_SERVICES);
  if (env['mongodb-2.4']) {
  var mongo = env['mongodb-2.4'][0]['credentials'];
  }
}
 
/* Mongodb config */
var mdbconf = {
  host: 'localhost',
  port: '27017',
  db: 'chatSS'
};
 
/*Conectar Mongo Local Host */
MongoClient.connect('mongodb://'+mdbconf.host+':'+mdbconf.port+'/'+mdbconf.db, function (err, db) {
/* Get a mongodb connection and start application 
MongoClient.connect(mongo.url, function (err, db) {*/
  
  if (err) return new Error('Connection to mongodb unsuccessful');
  
  var usersDAO = new userDAO(db); // Initialize userDAO
  var onlineUsers = [];

  /**************/
  
  app.get('/', function (req, res) {
    res.sendFile( __dirname + '/views/templates/Principal.html');
  });

  app.get('/Nosotros', function (req, res) {
    res.sendFile( __dirname + '/views/templates/Nosotros.html');
  });

  app.get('/OportunidadLaboral', function (req, res) {
    res.sendFile( __dirname + '/views/templates/Op_Laboral.html');
  });

  app.get('/Operaciones', function (req, res) {
    res.sendFile( __dirname + '/views/templates/Operaciones.html');
  });

  app.get('/Proyectos', function (req, res) {
    res.sendFile( __dirname + '/views/templates/Proyectos.html');
  });

  app.get('/ResponsabilidadSocial', function (req, res) {
    res.sendFile( __dirname + '/views/templates/Resp_Social.html');
  });

  app.get('/SignUp', function (req, res) {
    res.sendFile( __dirname + '/views/templates/signup.html');
  });
  
  app.post('/SignUp', function (req, res) {
    var username = req.body.username;
    var password = req.body.password;
    var email    = req.body.email;
    
    usersDAO.addUser(username, password, email, function (err, user) {
      if (err) {
        res.send({ 'error': true, 'err': err});
      }
      else {
        user.password = null;
        res.send({ 'error': false, 'user': user });
      }
    });
  });

  app.post('/Login', function (req, res) {
    var username = req.body.username;
    var password = req.body.password;
    
    usersDAO.validateLogin(username, password, function (err, user) {
      if (err) {
        res.send({'error': true, 'err': err});
      }
      else {
        user.password = null;
        res.send({ 'error': false, 'user': user});
      }
    });
  });
  /*
  app.get('*', function(req, res) {
    res.sendFile( __dirname + '/views/chat.html');
  });
  */

  app.use(express.static(__dirname + '/views'));

  
  /** *** *** ***
   *  Configuramos Socket.IO para estar a la escucha de
   *  nuevas conexiones. 
   */
  io.on('connection', function(socket) {
    
    console.log('New user connected');
    
    /**
     * Cada nuevo cliente solicita con este evento la lista
     * de usuarios conectados en el momento.
     */
    socket.on('all online users', function () {
      socket.emit('all online users', onlineUsers);
    });
    
    /**
     * Cada nuevo socket debera estar a la escucha
     * del evento 'chat message', el cual se activa
     * cada vez que un usuario envia un mensaje.
     * 
     * @param  msg : Los datos enviados desde el cliente a 
     *               través del socket.
     */
    socket.on('chat message', function(msg) {
      io.emit('chat message', msg);
    });
    
    /**
     * Mostramos en consola cada vez que un usuario
     * se desconecte del sistema.
     */
    socket.on('disconnect', function() {
      onlineUsers.splice(onlineUsers.indexOf(socket.user), 1);
      io.emit('remove user', socket.user);
      console.log('User disconnected');
    });
    
    /**
     * Cuando un cliente se conecta, emite este evento
     * para informar al resto de usuarios que se ha conectado.
     * @param  {[type]} nuser El nuevo usuarios
     */
    socket.on('new user', function (nuser) {
      socket.user = nuser;
      onlineUsers.push(nuser);
      io.emit('new user', nuser);
    });
    
  });
 
  /**
   * Iniciamos la aplicación en el puerto 3000
   */

   
  http.listen(port, function() {
    console.log('listening on :1337');
  });
});

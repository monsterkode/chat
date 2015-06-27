/******************************************************************************
 *
 *  2015.
 *
 *  Licensed under the Apache 2.0 license
 *  http://www.apache.org/licenses/LICENSE-2.0.html
 *
 ******************************************************************************/

"use strict";

var realm = "realm1",
    roomname = null,
    curidroom = null,
    cursubscription = null,
    // nick = null,
    owner = false,
    idowner = null,
    // iduser = null,
    user = {id: null, nick: null},
    idmember = null,
    sess = null,
    retryCount = 0,
    retryDelay = 2,
    isReconnect = false;

var wsuri;


setup();


function setup() {

  $('.loading-bar').show();
  update_status("Not connected.", false);
  $('.loading-bar').hide();

   // Checking nick
   if (user.nick === null) {
      $('#setupModal').modal('show');
   }else{
      connect();
   };
};


function update_status(text, status) {
   $(".status").text(text);
   if (status) {
      $(".status").addClass("row-success").removeClass("row-danger");
   }else{
      $(".status").addClass("row-danger").removeClass("row-success");
   };
};


function connect() {

  $('.loading-bar').show();

  if (document.location.protocol === "file:") {
     wsuri =  "ws://127.0.0.1:8080/ws";
  } else {
     var scheme = document.location.protocol === 'https:' ? 'wss://' : 'ws://';
     var port = document.location.port !== "" ? ':' + document.location.port : '';
     wsuri = scheme + document.location.hostname + port + "/ws";
  }

   // Set nickname
   user.nick = $('#input-nick').val().trim();

   // Connection initiation
   var connection = new autobahn.Connection({
      url: wsuri,
      realm: realm,
      max_retries: 30,
      initial_retry_delay: 2
   });

   // Connection opened
   connection.onopen = function (session) {
      console.log("Connection openend");
      $('#setupModal').modal('hide');

      sess = session;
      user.id = sess.id;

      set_user(user);

      update_status("Connected", true);
      $('.loading-bar').hide();


      // SUBSCRIBE to a topic and receive events
      //
      session.subscribe('chat.on_room_created', on_room_created).then(
         function (sub) {
            console.log('subscribed to topic chat.on_room_created');
         },
         function (err) {
            console.log('failed to subscribe to topic chat.on_room_created', err);
         }
      );

      sess.subscribe("wamp.subscription.on_subscribe", reload_members).then(
         function (sub) {
            console.log("subscribed to topic wamp.subscription.on_subscribe success");
         },
         function (err) {
            console.log('failed to subscribe to wamp.subscription.on_subscribe', err);
         }
      );

      sess.subscribe("wamp.subscription.on_unsubscribe", reload_members).then(
         function (sub) {
            console.log("subscribed to topic wamp.subscription.on_unsubscribe success");
         },
         function (err) {
            console.log('failed to subscribe to wamp.subscription.on_unsubscribe '+err);
         }
      );

      //subscribe on_delete of room to delete room
      //Bila room sudah tidak memiliki subscriber maka data pada db akan dihapus
      sess.subscribe("wamp.subscription.on_delete", delete_room).then(
            function (sub) {
               console.log("subscribed to topic wamp.subscription.on_delete");
            },
            function (err) {
               console.log('failed to subscribe to wamp.subscription.on_delete', err);
            }
         );

      session.subscribe('chat.on_room_deleted', on_room_deleted).then(
         function (sub) {
            console.log('subscribed to topic chat.on_room_deleted');
         },
         function (err) {
            console.log('failed to subscribe to topic chat.on_room_deleted', err);
         }
      );

      $('.cover').hide();
      $('.main').show();
      $('.room').show();

      reload_rooms();

   };

   // Connection closed
   connection.onclose = function() {
      console.log("Connection closed ", arguments);
      update_status('Not Connected.', false);
   }

   connection.open();

}

function submit_room () {
   var   $tab = $('#myTabContent'), 
         $active = $tab.find('.tab-pane.active'), 
         form = $active.find('form').attr('id');
   
   switch(form){
      case 'form-create-room':
            create_room();
         break;
      case 'form-join-room':
            join_room();
         break;
   }

   $('#roomModal').modal('hide');
   $('#'+form).trigger('reset');
}

function create_room(){
   roomname = $('#input-create-room').val();

   sess.subscribe('chat.room.'+roomname, get_message).then(
      function (sub) {
            console.log('subscribed to topic chat.room.', roomname);
      
            cursubscription = sub;
            curidroom = sub.id;

            $('.room').hide();
            $('.chat').show();
            set_room_brand(roomname);

            //idowner menggunakan session id
            sess.call("chat.room.create", [curidroom, roomname, user.id, user.nick]).then(
               function (res) {
                  console.log("call chat.room.create", res);
                  owner = true;
                  idowner = user.id;
                  // sess.subscribe("wamp.subscription.on_subscribe", reload_members).then(
                  //    function (sub) {
                  //       console.log("wamp.subscription.on_subscribe success");
                  //    },
                  //    function (err) {
                  //       console.log('failed to subscribe to wamp.subscription.on_subscribe '+err);
                  //    }
                  // );
                  // sess.subscribe("wamp.subscription.on_unsubscribe", reload_members).then(
                  //    function (sub) {
                  //       console.log("wamp.subscription.on_unsubscribe success");
                  //    },
                  //    function (err) {
                  //       console.log('failed to subscribe to wamp.subscription.on_unsubscribe '+err);
                  //    }
                  // );
               },
               function (err) {
                  console.log("failed to call chat.room.create", err);
               }
            );
         },
      function (err) {
         console.log('failed to subscribe to chat.room.'+roomname, err);
      }
   );
}

function on_room_created (args) {
   var msg = args[0];
   console.log("on_room_created() event received " + msg);

   reload_rooms();
}

function reload_rooms(){
   sess.call("chat.room.list", []).then(
         function (res) {
            console.log("call procedure chat.room.list", res);
            var rooms = JSON.parse(res);

            if (rooms.length > 0) {
               var content = '<div class="row">';
               for (var i in rooms){
                  content += '\
                        <div class="col-sm-6 col-md-4">\
                           <div class="thumbnail">\
                             <img src="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9InllcyI/PjxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB3aWR0aD0iMjQxIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDI0MSAyMDAiIHByZXNlcnZlQXNwZWN0UmF0aW89Im5vbmUiPjwhLS0KU291cmNlIFVSTDogaG9sZGVyLmpzLzEwMCV4MjAwCkNyZWF0ZWQgd2l0aCBIb2xkZXIuanMgMi42LjAuCkxlYXJuIG1vcmUgYXQgaHR0cDovL2hvbGRlcmpzLmNvbQooYykgMjAxMi0yMDE1IEl2YW4gTWFsb3BpbnNreSAtIGh0dHA6Ly9pbXNreS5jbwotLT48ZGVmcz48c3R5bGUgdHlwZT0idGV4dC9jc3MiPjwhW0NEQVRBWyNob2xkZXJfMTRlMjE1ZmEwNWUgdGV4dCB7IGZpbGw6I0FBQUFBQTtmb250LXdlaWdodDpib2xkO2ZvbnQtZmFtaWx5OkFyaWFsLCBIZWx2ZXRpY2EsIE9wZW4gU2Fucywgc2Fucy1zZXJpZiwgbW9ub3NwYWNlO2ZvbnQtc2l6ZToxMnB0IH0gXV0+PC9zdHlsZT48L2RlZnM+PGcgaWQ9ImhvbGRlcl8xNGUyMTVmYTA1ZSI+PHJlY3Qgd2lkdGg9IjI0MSIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNFRUVFRUUiLz48Zz48dGV4dCB4PSI5MC4yMTg3NSIgeT0iMTA1LjMzOTA2MjUiPjI0MXgyMDA8L3RleHQ+PC9nPjwvZz48L3N2Zz4=" alt="...">\
                             <div class="caption">\
                               <h3>'+rooms[i].name+'</h3>\
                               <p>Deskripsi</p>\
                               <p><button class="btn btn-primary btn-block" role="button" onclick="join_room(\''+rooms[i].name+'\')">Join!</button></p>\
                             </div>\
                           </div>\
                         </div>\
                        ';
               }
               content +='</div>';
               $('#room_window').html(content);
            }else{
               $('#room_window').html('\
                  <div class="alert alert-dismissable alert-info">\
                      <button type="button" class="close" data-dismiss="alert">×</button>\
                      <h4>Info!</h4>\
                      <p>Belum ada room, untuk membuat room baru silakan klik pada menu buat baru</p>\
                  </div>'
               );
            };
         },
         function (err) {
            console.log("failed to call procedure chat.room.list", err);
         }
      );   
}

function join_room(name){

   roomname = name;

   sess.subscribe('chat.room.'+roomname, get_message).then(
      function (sub) {
         console.log('subscribed to chat.room.'+roomname);
         set_room_brand(roomname);

         $('.room').hide();
         $(".chat").show();

         cursubscription  = sub;
         curidroom  = sub.id;
         // console.log("Current idroom: " + curidroom);

         // sess.subscribe("wamp.subscription.on_subscribe", reload_members).then(
         //    function (sub) {
         //       console.log("wamp.subscription.on_subscribe success");
         //    },
         //    function (err) {
         //       console.log('failed to subscribe to wamp.subscription.on_subscribe '+err);
         //    }
         // );

         // sess.subscribe("wamp.subscription.on_unsubscribe", reload_members).then(
         //    function (sub) {
         //       console.log("wamp.subscription.on_unsubscribe success");
         //    },
         //    function (err) {
         //       console.log('failed to subscribe to wamp.subscription.on_unsubscribe '+err);
         //    }
         // );

         //rpc kick user
         sess.register('chat.kick.'+user.id, leave_room).then(
            function (reg) {
               console.log('register procedure chat.kick.'+user.id);
            },
            function (err) {
               console.log('failed to register procedure kick', err);
            }
         );

      },
      function (err) {
         console.log('failed to subscribe to topic', err);
      }
   );
}

function leave_room(){
   cursubscription.unsubscribe().then(
      function (gone) {
         console.log('unsubscribe success');

         $('#chat-list').html("");
         $('#room-members').html("");

          $('.chat').hide();
          $('.room').show();
      },
      function (err) {
         console.log('failed to unsubscribe', err);
      }
    );
}


function delete_room (args, kwargs) {
   var idroom = args[1];

   //memastikan bahwa yang melakukan delete adalah subscriber dari room tsb.
   if(idroom == curidroom){
      sess.call("chat.room.delete", [idroom]).then(
         function (res) {
            console.log("call to procedure chat.room.delete", res);
         },
         function (err) {
            console.log("failed to call procedure chat.room.delete", err);
         }
      );
   }
}

function on_room_deleted(args) {
   var msg = args[0];
   console.log("on_room_deleted() event received " + msg);

   reload_rooms();
}

function set_room_brand (brand) {
   $('#room-brand').text('#'+brand)
}

function set_user (user) {
   //rpc user
   sess.register('chat.user.'+user.id, get_user).then(
      function (reg) {
         console.log('chat.user.'+user.id+' registered');
      },
      function (err) {
         console.log('failed to register procedure user', err);
      }
   );
   
   $('#nick').text(user.nick); 
};

function get_user() {
   return user;
}

function get_message(args, kwargs) {

  $('loading-bar').show();
   var message = args[0];
   var sender = args[1];

   if (user.nick === sender) {
      $('#chat-list').append('\
         <div class="row msg_container base_sent">\
             <div class="col-md-10 col-xs-10">\
                 <div class="messages msg_sent">\
                     <p>'+message+'</p>\
                     <time datetime="2009-11-13T20:00"> You • 51 min</time>\
                 </div>\
             </div>\
             <div class="col-md-2 col-xs-2 avatar">\
                 <img src="images/angklung.png" class=" img-responsive ">\
             </div>\
         </div>\
      ')
   }else{
      $('#chat-list').append('\
         <div class="row msg_container base_receive">\
             <div class="col-md-2 col-xs-2 avatar">\
                 <img src="images/angklung.png" class=" img-responsive ">\
             </div>\
             <div class="col-md-10 col-xs-10">\
                 <div class="messages msg_receive">\
                     <p>'+message+'</p>\
                     <time datetime="2009-11-13T20:00">'+sender+' • 51 min</time>\
                 </div>\
             </div>\
         </div>\
      ')
   };
  
  $('loading-bar').hide();
   // console.log(args);
}

function reload_members(args, kwargs) {
   // var sesmember = args[0]; //member session id
   var submember = args[1]; //member subscription id

   var curtopic = "chat.room."+roomname;
   var membertopic = null;

   sess.call("wamp.subscription.get", [submember]).then(
      function (res) {
        console.log("call to procedure wamp.subscription.get");
         membertopic = res.uri;
         //Memastikan yang direload adalah room yang dimaksud
         if(curtopic == membertopic){
            list_member();
         }
      },
      function (err) {
         console.log('failed to call to procedure wamp.subscription.get', err);
      });
}

function list_member(){
   sess.call("wamp.subscription.list_subscribers", [cursubscription.id]).then(
      function (res) {
         console.log("call to procedure wamp.subscription.list_subscribers", res);
         $('#room-members').html("");
         var userlist = null;

         for (var i in res){
            idmember = res[i];
            if(idmember != user.id){
               sess.call("chat.user."+idmember, []).then(
                  function (res2) {
                     console.log("call to procedure chat.user."+idmember, res2);
                     // $('#member tr:last').after('<tr><td>'+res2+'</td><td><button onclick="kick_member(\''+idmember+'\')">Kick!</button></td></tr>');
                     
                     $('#room-members').append('\
                        <div class="list-group-item">\
                            <div class="row-picture">\
                                <img class="circle" src="http://lorempixel.com/56/56/people/1" alt="icon">\
                            </div>\
                            <div class="row-content">\
                                <h4 class="list-group-item-heading">'+res2.nick+'</h4>');
                        
                    if (idowner === user.id) $('#room-members').append('<p class="list-group-item-text"><button class="btn btn-sm btn-warning pull-right" onclick="kick_member(\''+res2.id+'\')">Kick!</button></p>');
                     
                     $('#room-members').append('</div>\
                        </div>\
                        <div class="list-group-separator"></div>\
                     ');
                  },
                  function (err) {
                     console.log('failed to call to procedure chat.user.'+idmember, err);
                  }
                );
            }  
         }
      },
      function (err) {
         console.log('failed call to procedure wamp.subscription.list_subscribers', err);
      });
}


function kick_member(idmember){
   sess.call("chat.kick."+idmember, []).then(
      function (res) {
         console.log("Kick success: "+res);
         list_member();
      },
      function (err) {
         console.log('failed to kick member', err);
      }
  );
}

function send_msg(msg){
   if(roomname && sess){
      var msg = $("#input-message").val();
      sess.publish("chat.room."+roomname, [msg, user.nick], {}, {exclude_me: false});
      $("#input-message").val("");
   }
}
/******************************************************************************
 *
 *  2015.
 *
 *  Licensed under the Apache 2.0 license
 *  http://www.apache.org/licenses/LICENSE-2.0.html
 *
 ******************************************************************************/

"use strict";

var realm = "realm1";
var wsuri;


var server = null,
    roomname = null,
    curidroom = null,
    cursubscription = null,
    nick,
    owner,
    iduser = null,
    sess = null,
    retryCount = 0,
    retryDelay = 2,
    oldHash = window.location.href,
    isReconnect = false;

var chatWindow = null;

$('.loading-bar').show();
updateStatusline("Not connected.", false);
$('.loading-bar').hide();

setup();

function updateStatusline(text, status) {
   $(".status").text(text);
   if (status) {
      $(".status").addClass("row-success").removeClass("row-danger");
   }else{
      $(".status").addClass("row-danger").removeClass("row-success");
   };
};


function connect() {

   // Set server-name and nickname
   server = $('#input-server').val().trim();
   nick = $('#input-nick').val().trim();

   // Set wsuri
   wsuri = "ws://"+server+":8080/ws";

   // Connection initiation
   var connection = new autobahn.Connection({
      url: wsuri,
      realm: realm,
      max_retries: 30,
      initial_retry_delay: 2
   });

   // Connection opened
   connection.onopen = function (session) {
      console.log("Connected to " + wsuri);
      $('#setupModal').modal('hide');

      sess = session;
      iduser = sess.id;

      setNickName(nick);

      // sess.prefix("api", prefix + ".chat");
      $('.loading-bar').show();
      updateStatusline("Connected to " + wsuri, true);
      $('.loading-bar').hide();


      $('.cover').hide();
      $('.main').show();
      $('.room').show();

      list_room();

      //subscribe on_delete of room to delete room
      //Bila room sudah tidak memiliki subscriber maka data pada db akan dihapus
      session.subscribe("wamp.subscription.on_delete", delete_room).then(
            function (sub) {
               console.log("wamp.subscription.on_delete success");
            },
            function (err) {
               console.log('Failed to subscribe to wamp.subscription.on_delete '+err);
            }
         );

   };

   // Connection closed
   connection.onclose = function() {
      console.log("connection closed ", arguments);
      $('.loading-bar').show();
      updateStatusline('Not Connected.', false);
      $('.loading-bar').hide();
   }

   connection.open();

}


function setup() {
   chatWindow = $("#chat_window");

   // add 'onhashchange' event to trigger the channel change + chat window display
   // window.onhashchange = onHashChanged;

   // Checking variable server and nick
   if (server==null || nick == 'undefined') {
      $('#btn-setup').trigger('click');
   }else{
      connect();
   };
};


function setNickName (nick) {
   //rpc username
   sess.register('username.'+iduser, getNickName).then(
      function (reg) {
         console.log('username.'+iduser+' registered');
      },
      function (err) {
         console.log('failed to register procedure user', err);
      }
   );
   
   $('#nick').text(nick); 
};

function getNickName() {
   return nick;
}

function list_room(){
   sess.call("room.list", []).then(
         function (res) {
            console.log("list result:", res);
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
                      <p>Belum ada room dalam server ini, untuk membuat room baru silakan klik pada menu buat baru</p>\
                  </div>'
               );
            };
         },
         function (err) {
            console.log("list_room error:", err);
         }
      );   
}

function show_rooms () {
   $('.chat').hide();
   $('.room').show();
   $('#room-members').html("")
   list_room();
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
   sess.subscribe('room.'+roomname, get_message).then(
      function (sub) {
            console.log('subscribed to '+roomname);
            console.log(sub);
            curidroom = sub.id;
            //idowner menggunakan session id
            sess.call("room.create", [curidroom, roomname, iduser, nick]).then(
               function (res) {
                  console.log(res);
                  $('.room').hide();
                  $('.chat').show();
                  set_room_brand(roomname);
                  owner = true;
                  cursubscription = sub;
                  sess.subscribe("wamp.subscription.on_subscribe", reload_member).then(
                     function (sub) {
                        console.log("wamp.subscription.on_subscribe success");
                     },
                     function (err) {
                        console.log('Failed to subscribe to wamp.subscription.on_subscribe '+err);
                     }
                  );
                  sess.subscribe("wamp.subscription.on_unsubscribe", reload_member).then(
                     function (sub) {
                        console.log("wamp.subscription.on_unsubscribe success");
                     },
                     function (err) {
                        console.log('Failed to subscribe to wamp.subscription.on_unsubscribe '+err);
                     }
                  );
               },
               function (err) {
                  console.log("create_room error:", err);
               }
            );
         },
      function (err) {
         console.log('failed to subscribe to topic', err);
      }
   );
}

function get_message (args) {
   var message = args[0];
   var sender = args[1];

   if (nick === sender) {
      $('#chat-list').append('\
         <div class="row msg_container base_sent">\
             <div class="col-md-10 col-xs-10">\
                 <div class="messages msg_sent">\
                     <p>'+message+'</p>\
                     <time datetime="2009-11-13T20:00"> You • 51 min</time>\
                 </div>\
             </div>\
             <div class="col-md-2 col-xs-2 avatar">\
                 <img src="http://www.bitrebels.com/wp-content/uploads/2011/02/Original-Facebook-Geek-Profile-Avatar-1.jpg" class=" img-responsive ">\
             </div>\
         </div>\
      ')
   }else{
      $('#chat-list').append('\
         <div class="row msg_container base_receive">\
             <div class="col-md-2 col-xs-2 avatar">\
                 <img src="http://www.bitrebels.com/wp-content/uploads/2011/02/Original-Facebook-Geek-Profile-Avatar-1.jpg" class=" img-responsive ">\
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

   console.log(args);
}

function reload_member(args, kwargs) {
   console.log("Reload", args);
   var sesmember = args[0]; //member session id
   var submember = args[1]; //member subscription id

   var curtopic = "room."+roomname;
   var membertopic = null;
   sess.call("wamp.subscription.get", [submember]).then(
      function (res) {
         membertopic = res.uri;
         //Memastikan yang direload adalah room yang dimaksud
         if(curtopic == membertopic){
            list_member();
         }
      },
      function (err) {
         console.log('failed to get session subscription', err);
      });
   

}

function list_member(){
   console.log('masuk');
   sess.call("wamp.subscription.list_subscribers", [cursubscription.id]).then(
      function (res) {
         console.log(res);
         $('#room-members').html("");
         for (var i in res){
            var idmember = res[i];
            if(idmember != iduser){
               sess.call("username."+idmember, []).then(
                  function (res2) {
                     console.log(res2);
                     // $('#member tr:last').after('<tr><td>'+res2+'</td><td><button onclick="kick_member(\''+idmember+'\')">Kick!</button></td></tr>');
                     $('#room-members').append('\
                        <div class="list-group-item">\
                            <div class="row-picture">\
                                <img class="circle" src="http://lorempixel.com/56/56/people/1" alt="icon">\
                            </div>\
                            <div class="row-content">\
                                <h4 class="list-group-item-heading">'+res2+'</h4>\
                                <p class="list-group-item-text"><button class="btn btn-sm btn-warning pull-right" onclick="kick_member(\''+idmember+'\')">Kick!</button></p>\
                            </div>\
                        </div>\
                        <div class="list-group-separator"></div>\
                     ');
                  },
                  function (err) {
                     console.log('failed to get session subscription', err);
                  }
                  );
            }  
         }
      },
      function (err) {
         console.log('failed to get session subscription', err);
      });
}

function join_room(name){
   roomname = name;

   sess.subscribe('room.'+roomname, get_message).then(
      function (sub) {
         console.log('subscribed to '+roomname);
         set_room_brand(roomname);
         $('.room').hide();
         $(".chat").show();

         cursubscription  = sub;

         sess.subscribe("wamp.subscription.on_subscribe", reload_member).then(
            function (sub) {
               console.log("wamp.subscription.on_subscribe success");
            },
            function (err) {
               console.log('Failed to subscribe to wamp.subscription.on_subscribe '+err);
            }
         );

         sess.subscribe("wamp.subscription.on_unsubscribe", reload_member).then(
            function (sub) {
               console.log("wamp.subscription.on_unsubscribe success");
            },
            function (err) {
               console.log('Failed to subscribe to wamp.subscription.on_unsubscribe '+err);
            }
         );



         //rpc kick user
         sess.register('kick.'+iduser, leave_room).then(
            function (reg) {
               console.log('kick.'+iduser+' registered');
            },
            function (err) {
               console.log('failed to register procedure kick', err);
            }
         );

         console.log("Sub ID :" + cursubscription);
         list_member();
      },
      function (err) {
         console.log('failed to subscribe to topic', err);
      }
   );


}

function leave_room(){
   cursubscription.unsubscribe().then(
      function () {
         console.log('unsubscribe success');
         $('.room').show();
         $(".chat").hide();
         $('#chat-list').html("");
         $('#room-members').hide();
         list_room();
      },
      function (err) {
         console.log('failed to unsubscribe', err);
      }
      );
}

function set_room_brand (brand) {
   $('#room-brand').text('#'+brand)
}

function kick_member(idmember){
   sess.call("kick."+idmember, []).then(
      function (res) {
         console.log(res);
         list_member();
      },
      function (err) {
         console.log('failed to kick member', err);
      }
      );
}

function send_msg(msg){
   if(roomname && sess){
      console.log(roomname);
      var msg = $("#input-message").val();
      sess.publish("room."+roomname, [msg, nick], {}, {exclude_me: false});
      $("#input-message").val("");
   }
}

function delete_room (args, kwargs) {
   console.log("WAMP meta event", args[1]);
   var idroom = args[1];
   console.log(idroom);

   //memastikan bahwa yang melakukan delete adalah subscriber dari room tsb.
   if(idroom == curidroom){
      sess.call("room.delete", [idroom]).then(
         function (res) {
            console.log("delete_room :", res);
         },
         function (err) {
            console.log("delete_room error:", err);
         }
         );
   }
}
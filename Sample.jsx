
// Пример универсального обработчика запросов и обновления календаря

function backendRequestCustomSocket (socket, method, bearerToken, data, requestId) {
    //let my_socket = getws();
    let old_onmessage = socket.onmessage || (() => {});

    socket.onmessage = (msg) => {
        let msg_data = JSON.parse(msg.data);
        //console.log(msg_data);
        if (msg_data.statusCode == 401 || msg_data.statusCode == 403 ) {
            
                initializedStore.dispatch(clearToken('')) ;
                refreshToken()
                    .then(() => {
                        old_onmessage({data: JSON.stringify(msg_data)});
                    }).catch(() => {
                      
                        old_onmessage({data: JSON.stringify(msg_data)});
                    });
                
           
        } else{
            old_onmessage({data: JSON.stringify(msg_data)});
        }
    };
    socket.onerror = (err) => {
        reject(err);
    };
    let request = {
        "method": method,
        "bearerToken":bearerToken
    };
    if (data) {
        request["data"] = data;
    }
    if (requestId) {
        request["requestId"] = requestId;
    }
   
        let req = JSON.stringify(request);
        console.log("sending request: " + req);
        if (socket) {
            socket.send(req);
        } else {
            console.log("couldn't find socket");
        }
   
}

function backendRequestPromise(method, bearerToken, data, requestId) {
    return new Promise ((resolve, reject) => {
        let req_socket = new WebSocket(WS_URL);
        req_socket.onmessage = (msg) => {
            let parsed_msg = JSON.parse(msg.data);
            //console.log(parsed_msg);
            if (parsed_msg.statusCode == 200) {
                let response = parsed_msg.data;
                //console.log(response);
                req_socket.close();
                resolve(response);
            } else {
                req_socket.close();
                reject(parsed_msg)
            }
        };
        req_socket.onerror = (err) => {
            reject(err);
        };
        req_socket.onopen = () => {
            backendRequestCustomSocket(
                req_socket,
                method,
                bearerToken,
                {
                    lang:initializedStore.getState().data.settings.lang,
                   
                    event_id: initializedStore.getState().data.event.event_id,
                    ...data
                },
                requestId)
        }
    });
}
_onRefresh() {
    backendRequestPromise('calendarGetItems', this.props.userToken).then(
      res => {
        console.log('got items');
        let response = [];
        if (!!res && res.length > 0) {
          response = res.map(el => {
            let new_el = el;
            if (!new_el.date && !!new_el.period_start) {
              new_el.date = new_el.period_start;
            }
            return new_el;
          });
        }
        let old_parsed_cal = parseCalItems(
          response.filter(el => !!el.date && el.video_room != true)
        );
        let old_sorted_keys = Object.keys(old_parsed_cal).sort((d1, d2) => {
          return moment(d1).isSameOrAfter(d2) ? -1 : 1;
        }); 

        backendRequestPromise('calendarGetUserInvites', this.props.userToken)
          .then(respo => {
            let resp = [];
            if (!!respo && respo.length > 0) {
              resp = respo.map(el => {
                let new_el = el;
                if (!new_el.date && !!new_el.period_start) {
                  new_el.date = new_el.period_start;
                }
                return new_el;
              });
            }
            let response_invites = resp
              .filter(el => !!el.date)
              .map(el => {
                return { ...el, invite: true, item_id: el.itemid };
              });
            console.log('got invites', response_invites);
            let new_items = { ...old_parsed_cal };
            let parsed_cal_invites = parseCalItems(response_invites);
            Object.keys(parsed_cal_invites).forEach(el => {
              if (new_items.hasOwnProperty(el)) {
                new_items[el] = [...new_items[el], ...parsed_cal_invites[el]];
              } else {
                new_items[el] = parsed_cal_invites[el];
              }
            });
            console.log('new_items', new_items);
            let sorted_keys_invites = Object.keys({
              ...new_items,
              ...old_sorted_keys
            }).sort((d1, d2) => {
              return isLater(d1, d2) ? -1 : 1;
            });
            console.log('sorted key invites', sorted_keys_invites);
            this.props.updCalendar(new_items, sorted_keys_invites);
            this.props.setCalendarNeedsUpdate(false);
          })
          .catch(() => {
            this.props.updCalendar(old_parsed_cal, old_sorted_keys);
            this.props.setCalendarNeedsUpdate(false);
          });
      }
    );
  }

  // Пример универсального обработчика запросов и обновления календаря
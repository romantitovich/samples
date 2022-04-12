import {
  Card,
  Col,
  Container,
  Grid,
  Row,
  ScrollableTab,
  Tab,
  TabHeading,
  Tabs
} from 'native-base';
import {
  Dimensions,
  FlatList,
  Image,
  ImageBackground,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  WebView
} from 'react-native';
import {
  calRemoveItem,
  receiveData,
  removeData,
  setCalendarNeedsUpdate,
  setNotifications,
  updCalendar
} from '../../actions/data';
import {
  disableNetWarn,
  enableNetWarn,
  toggleNewsOverlay
} from '../../actions/control';
import { getchat, refreshRooms } from '../../methods/chat_client';
import { isLater, parseCalItems } from '../../methods/calendar_methods';
import { maincolor, maincolor2 } from '../../constants/color';

import CalendarDayCard from '../../components/cards/CalendarDayCard';
import DeviceInfo from 'react-native-device-info';
import Drawer from 'react-native-drawer';
import DrawerContent from '../../components/cards/DraweContent';
import Ionicons from 'react-native-vector-icons/Ionicons';
import React from 'react';
import RoomList from '../../components/cards/RoomList';
import SubscreenHeader from '../../components/headers_footers/subscreen_header';
import { backendRequestPromise } from '../../methods/ws_requests';
import card from '../../styles/cards';
import { connect } from 'react-redux';
import moment from 'moment';
import tab from '../../styles/tabs';

const window = Dimensions.get('window');

class NotificationsScreen extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      needs_update: true,
      calendar_invites_active: true,
      chat_invites_active: true,
      general_active: true,
      notificat: []
    };

    this.drawer = new React.createRef();
    this.menu_fun = this.menu_fun.bind(this);
    this.close_drawer = this.close_drawer.bind(this);
  }

  componentDidMount() {
    this._onRefresh();
  }

  componentWillUnmount() {
    if (this.didBlurSubscription) this.didBlurSubscription.remove();
  }

  _onRefresh = () => {
    this.setState({ needs_update: true }, () => {
      refreshRooms();
      backendRequestPromise(
        'getUserMailingHistory',
        this.props.bearerToken,
        {},
        '',
        this.props.navigation
      )
        .then(respo => {
          this.setState({ notificat: respo });
        })
        .catch(err => {
          this.setState({ needs_update: false });
        });
      this.didBlurSubscription = this.props.navigation.addListener(
        'willBlur',
        payload => {
          if (this.close_drawer) this.close_drawer();
        }
      );

      backendRequestPromise(
        'calendarGetUserInvites',
        this.props.bearerToken,
        {},
        '',
        this.props.navigation
      )
        .then(respo => {
          let resp = respo.map(el => {
            let new_el = el;
            if (!new_el.date && !!new_el.period_start) {
              new_el.date = new_el.period_start;
            }
            return new_el;
          });
          let response_invites = resp
            .filter(el => !!el.date && el.statusid != 1 && el.statusid != 2)
            .map(el => {
              return { ...el, invite: true, item_id: el.itemid };
            });
          // console.log("got invites", response_invites);
          let new_items = {};
          let parsed_cal_invites = parseCalItems(response_invites);
          Object.keys(parsed_cal_invites).forEach(el => {
            if (new_items.hasOwnProperty(el)) {
              new_items[el] = [...new_items[el], ...parsed_cal_invites[el]];
            } else {
              new_items[el] = parsed_cal_invites[el];
            }
          });
          // console.log("new_items", new_items);
          let sorted_keys_invites = Object.keys(new_items).sort((d1, d2) => {
            return isLater(d1, d2) ? -1 : 1;
          });
          // console.log("sorted key invites", sorted_keys_invites);
          this.props.setNotifications(
            this.props.notifications.map(not => {
              return { ...not, seen: true };
            })
          ); //not.notification_type != "general_notification" ? true : not.seen})}));
          this.setState({
            needs_update: false,
            calendar: {
              items: new_items,
              sorted_keys: sorted_keys_invites
            }
          });
        })
        .catch(err => {
          this.setState({ needs_update: false });
        });
    });
  };

  menu_fun() {
    this.drawer.open();
  }

  close_drawer() {
    this.drawer.close();
  }

  render() {
    // console.log("all notifications", this.props.notifications);
    return (
      <Drawer
        content={
          <DrawerContent
            navigation={this.props.navigation}
            open_facts={this.open_facts}
            close_drawer={this.close_drawer}
          />
        }
        ref={r => (this.drawer = r)}
        openDrawerOffset={0.0}
        side={'right'}
        acceptPan
        negotiatePan
      >
        <ImageBackground
          style={{ width: '100%', height: '100%' }}
          source={require('../../../assets/back.png')}
        >
          <View style={{ flex: 1 /*height:"100%"*/ }}>
            {/*<MainHeader menu_fun={this.menu_fun} navigation={this.props.navigation}/>*/}
            <SubscreenHeader
              menu_fun={this.menu_fun}
              navigation={this.props.navigation}
            />
            <ScrollView
              refreshControl={
                <RefreshControl
                  refreshing={this.state.needs_update}
                  onRefresh={this._onRefresh}
                />
              }
              style={{ flex: 1, flexGrow: 1 }}
            >
              <TouchableOpacity
                onPress={() => {
                  this.setState({
                    calendar_invites_active: !this.state.calendar_invites_active
                  });
                }}
                style={{
                  height: 40,
                  borderTopWidth: 1,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottomWidth:
                    !!this.state.calendar &&
                    !!this.state.calendar.sorted_keys &&
                    this.state.calendar_invites_active &&
                    this.state.calendar.sorted_keys.length > 0
                      ? 1
                      : 0,
                  borderColor: 'rgb(220,219,216)',
                  backgroundColor: 'rgb(246,246,246)'
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    color: '#000',
                    marginHorizontal: 20,
                    fontFamily: 'times new roman'
                  }}
                >
                  {this.props.lang === 'ru'
                    ? 'Приглашения на встречи:'
                    : 'Meeting invites:'}
                </Text>
                <View
                  style={{
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: 40,
                    width: 40,
                    marginRight: 20
                  }}
                >
                  {this.state.calendar_invites_active ? (
                    <Image
                      style={{ width: 18, height: 12, resizeMode: 'contain' }}
                      source={require('../../../assets/arrowup.png')}
                    />
                  ) : (
                    <Image
                      style={{ width: 18, height: 12, resizeMode: 'contain' }}
                      source={require('../../../assets/arrowdown.png')}
                    />
                  )}
                </View>
              </TouchableOpacity>

              {!!this.state.calendar &&
                this.state.calendar_invites_active &&
                Object.keys(this.state.calendar.items).length > 0 && (
                  <View style={{ marginTop: 0 }} zIndex={6}>
                    {!!this.state.calendar &&
                      !!this.state.calendar.sorted_keys &&
                      Object.keys(this.state.calendar.items).length > 0 && (
                        <FlatList
                          contentContainerStyle={{
                            paddingTop: 10,
                            paddingBottom: 60
                          }}
                          ListEmptyComponent={() => {
                            return (
                              <View
                                style={{
                                  backgroundColor: 'rgba(0,0,0,0)',
                                  height: 1
                                }}
                              />
                            );
                          }}
                          /*refreshControl={
                                                <RefreshControl
                                                    refreshing={this.state.needs_update}
                                                    onRefresh={this._onRefresh}
                                                />
                                            }*/
                          keyExtractor={el => {
                            return el.toString();
                          }}
                          data={this.state.calendar.sorted_keys}
                          renderItem={el => {
                            let el_key = el.item;
                            //console.log("calendar date: " + el_key);
                            if (!!el_key) {
                              return (
                                <CalendarDayCard
                                  key={el_key}
                                  items={this.state.calendar.items[el_key]}
                                  date={el_key}
                                  navigation={this.props.navigation}
                                  lang={this.props.lang}
                                  token={this.props.bearerToken}
                                  update={val => {
                                    this.props.setCalendarNeedsUpdate(val);
                                    this._onRefresh();
                                  }}
                                  remove={id => {
                                    this.props.calRemoveItem(id);
                                    this._onRefresh();
                                  }}
                                />
                              );
                            } else {
                              return null;
                            }
                          }}
                        />
                      )}
                  </View>
                )}

              <TouchableOpacity
                onPress={() => {
                  this.setState({
                    chat_invites_active: !this.state.chat_invites_active
                  });
                }}
                style={{
                  height: 40,
                  borderTopWidth: 1,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottomWidth: 1,
                  borderColor: 'rgb(220,219,216)',
                  backgroundColor: 'rgb(246,246,246)'
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    color: '#000',
                    fontFamily: 'times new roman',
                    marginHorizontal: 20
                  }}
                >
                  {this.props.lang === 'ru'
                    ? 'Приглашения в чате:'
                    : 'Chat invites:'}
                </Text>
                <View
                  style={{
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: 40,
                    width: 40,
                    marginRight: 20
                  }}
                >
                  {this.state.chat_invites_active ? (
                    <Image
                      style={{ width: 18, height: 12, resizeMode: 'contain' }}
                      source={require('../../../assets/arrowup.png')}
                    />
                  ) : (
                    <Image
                      style={{ width: 18, height: 12, resizeMode: 'contain' }}
                      source={require('../../../assets/arrowdown.png')}
                    />
                  )}
                </View>
              </TouchableOpacity>

              {this.state.chat_invites_active && (
                <View style={{ flex: 1 }}>
                  <RoomList
                    user_id={this.props.user_id}
                    navigation={this.props.navigation}
                  />
                </View>
              )}

              <TouchableOpacity
                onPress={() => {
                  this.setState({ general_active: !this.state.general_active });
                }}
                style={{
                  height: 40,
                  borderTopWidth: 1,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottomWidth:
                    !!this.state.notifications &&
                    this.state.general_active &&
                    this.state.notifications.length > 0
                      ? 1
                      : 0,
                  borderColor: 'rgb(220,219,216)',
                  backgroundColor: 'rgb(246,246,246)'
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    color: '#000',
                    fontFamily: 'times new roman',
                    marginHorizontal: 20
                  }}
                >
                  {this.props.lang === 'ru' ? 'Уведомления:' : 'Notifications:'}
                </Text>
                <View
                  style={{
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: 40,
                    width: 40,
                    marginRight: 20
                  }}
                >
                  {this.state.general_active ? (
                    <Image
                      style={{ width: 18, height: 12, resizeMode: 'contain' }}
                      source={require('../../../assets/arrowup.png')}
                    />
                  ) : (
                    <Image
                      style={{ width: 18, height: 12, resizeMode: 'contain' }}
                      source={require('../../../assets/arrowdown.png')}
                    />
                  )}
                </View>
              </TouchableOpacity>

              {this.state.general_active && (
                <View style={{ flex: 1 }}>
                  <ScrollView>
                    {!!this.state.notificat ? (
                      this.state.notificat
                        .reverse()
                        .filter((elem, index, arr) => {
                          if (elem.hidden) return false;
                          if (
                            !!elem['google.c.a.e'] &&
                            arr.findIndex(
                              el =>
                                el.title == elem.title &&
                                el.body == elem.body &&
                                !el['google.c.a.e']
                            ) != -1
                          )
                            return false;
                          return true;
                        })
                        .map((notif, index, arr) => {
                          return (
                            <Card
                              key={notif.title + notif.body}
                              style={[
                                card.base,
                                {
                                  alignSelf: 'center',
                                  width: !!DeviceInfo.isTablet()
                                    ? window.width / 2 - 30
                                    : window.width - 30,
                                  marginTop: 10,
                                  paddingVertical: 20,
                                  paddingHorizontal: 15,
                                  borderRadius: 15
                                },
                                this.props.base_color && {
                                  backgroundColor: this.props.base_color
                                }
                              ]}
                            >
                              {/*<TouchableOpacity
                                                            style={{position:"absolute", top:5, right:15, height:28, justifyContent:"center", alignItems:"center", borderRadius:14}}
                                                            onPress={() => {
                                                                let ind = arr.length - index - 1;
                                                                if (ind >= 0 && ind < arr.length) {
                                                                    this.props.setNotifications([...this.props.notifications.slice(0,ind), ...this.props.notifications.slice(ind +1, arr.length)]);
                                                                }
                                                            }}
                                                        >
                                                            <Text style={{color: maincolor2,fontFamily:"times new roman", fontSize: 12}}>{this.props.lang == "ru" ? "Удалить" : "Remove"}</Text>
                                                            {/*<Ionicons name={"ios-close"} color={"black"} size={30} />
                                                        </TouchableOpacity>*/}
                              <Row style={{ marginBottom: 3 }}>
                                <Text
                                  style={{
                                    fontWeight: 'bold',
                                    fontSize: 14,
                                    fontFamily: 'times new roman'
                                  }}
                                >
                                  {notif.Title}
                                </Text>
                              </Row>
                              <Row style={{ marginBottom: 3 }}>
                                <Text
                                  style={{
                                    fontWeight: 'bold',
                                    fontSize: 12,
                                    fontFamily: 'times new roman',
                                    paddingBottom: 15
                                  }}
                                >
                                  {notif.Body}
                                </Text>
                              </Row>
                              {!!notif.SentOn && (
                                <View
                                  style={{ alignItems: 'flex-end', bottom: 10 }}
                                >
                                  <View
                                    style={{
                                      alignSelf: 'flex-end',
                                      height: 25,
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      width: 'auto',
                                      borderRadius: 33,
                                      backgroundColor: maincolor2
                                    }}
                                  >
                                    <Text
                                      style={{
                                        color: 'white',
                                        fontSize: 12,
                                        fontFamily: 'times new roman',
                                        paddingHorizontal: 8
                                      }}
                                    >
                                      {moment(notif.SentOn)
                                        .locale(this.props.lang)
                                        .format('HH:mm DD MMMM YYYY')}
                                    </Text>
                                  </View>
                                </View>
                              )}
                            </Card>
                          );
                        })
                    ) : (
                      <View>
                        <Text></Text>
                      </View>
                    )}
                  </ScrollView>
                </View>
              )}
            </ScrollView>
          </View>
        </ImageBackground>
      </Drawer>
    );
  }
}

const mapStateToProps = state => {
  return {
    lang: state.data.settings.lang,
    received_data: state.data.received_data,
    bearerToken: state.data.userToken,
    notifications: state.data.notifications,
    user_id: state.data.chat.login
  };
};

const mapDispatchToProps = dispatch => {
  return {
    receiveData: data => dispatch(receiveData(data)),
    removeData: key => dispatch(removeData({ key })),
    toggle: () => dispatch(toggleNewsOverlay()),
    enableNetWarn: () => dispatch(enableNetWarn()),
    disableNetWarn: () => dispatch(disableNetWarn()),
    updCalendar: (items, sorted_keys) =>
      dispatch(updCalendar({ items, sorted_keys })),
    setCalendarNeedsUpdate: needs_update =>
      dispatch(setCalendarNeedsUpdate({ needs_update })),
    calRemoveItem: item_id => dispatch(calRemoveItem({ item_id })),
    setNotifications: notifications =>
      dispatch(setNotifications({ notifications }))
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(NotificationsScreen);

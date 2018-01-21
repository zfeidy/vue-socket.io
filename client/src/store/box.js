import io from 'socket.io-client';
import {socketUrl} from '../config/index.js';
import md5 from '../lib/md5.js';
import Cookies from 'js-cookie';
import chat from './chat.js';
// import {list} from './user.json';

export default {
  namespaced: true,
  state: {
    userListResize: 200,
    itemIndex: 10, // -2 ：默认没有选中的情况， -1 ：群组聊天室，   0-9 ：正常
    userInfo: {
      userId: '',
      passport: '',
      username: '',
      avatar: ''
    },
    template: {
      userInfo: {
        username: '',
        avatar: '',
        userId: 0
      },
      noReadNum: 0,
      list: []
    },
    messageId: 0,
    httpServer: null,
    connect: false,
    userList: {
      '10': {
        userInfo: {
          username: '机器人',
          avatar: 'https://raw.githubusercontent.com/beautifulBoys/vue-socket.io/master/client/src/images/user/robot.png',
          userId: 10
        },
        noReadNum: 0,
        list: [{
          type: 2,
          message: '你好，我是机器人 “菲菲”，你想和我聊什么呀？(*╹▽╹*)'
        }]
      },
      '20': {
        userInfo: {
          username: '全站聊天室',
          avatar: 'https://raw.githubusercontent.com/beautifulBoys/vue-socket.io/master/client/src/images/user/group.png',
          userId: 20
        },
        noReadNum: 0,
        list: []
      }
    },
    loginStatus: false,
    error_tip: ''
  },
  mutations: {
    error_tip_change (state, text) {
      state.error_tip = text;
    },
    changeUserListResize (state, num) {
      state.userListResize = num;
    },
    itemChangeEvent (state, n) {
      state.itemIndex = n;
    },
    messageIdChange (state) {
      state.messageId += 1;
    },
    userListChange (state, obj) {
      console.log(obj);
      for (let k in obj) {
        if ((obj[k].userId - 0 !== state.userInfo.userId - 0) && !state.userList[k]) {
          state.template = {
            userInfo: {
              username: obj[k].username,
              avatar: obj[k].avatar,
              userId: obj[k].userId
            },
            noReadNum: 0,
            list: []
          };
          state.userList[k] = state.template;
        }
      }
      console.log(state.userList);
    },
    saveUserInfo (state, obj) {
      Cookies.set('username', obj.username, { expires: 1 });
      Cookies.set('userId', obj.userId, { expires: 1 });
      Cookies.set('passport', obj.passport, { expires: 1 });
      state.userInfo = {
        userId: obj.userId,
        avatar: obj.avatar,
        username: obj.username,
        passport: obj.passport
      };
    },
    clearUserInfo (state) {
      Cookies.remove('userId');
      Cookies.remove('username');
      Cookies.remove('passport');
      window.loginStatus = false;
      state.loginStatus = false;
      state.userInfo = {
        userId: '',
        avatar: '',
        username: '',
        passport: ''
      };
    }
  },
  actions: {
    login ({commit, dispatch, state}, {username, password, cbb}) {
      commit('error_tip_change', '');
      state.httpServer = io.connect(socketUrl);
      state.httpServer.emit('login', {
        username,
        password: md5(password)
      });
      state.httpServer.on('login', (obj) => { // {userId}
        if (obj.code === 200) {
          commit('saveUserInfo', obj.data);
          state.connect = true;
          dispatch('httpServerInit');
        } else if (obj.code === 300) {
          commit('error_tip_change', obj.message);
        } else {
          console.log('这里出错了，请检查');
        }
        if (cbb) cbb(obj);
      });
    },
    autoLogin ({commit, dispatch, state}, {userId, passport, cbb}) {
      commit('error_tip_change', '');
      state.httpServer = io.connect(socketUrl);
      state.httpServer.emit('auto-login', {
        userId,
        passport
      });

      state.httpServer.on('auto-login', (obj) => { // {userId}
        if (obj.code === 200) {
          commit('saveUserInfo', obj.data);
          dispatch('httpServerInit');
        } else if (obj.code === 300) {
          console.log('这里采用上方弹出提示条的方式提醒用户出错喽。');
        } else if (obj.code === 301) {
          commit('clearUserInfo');
          console.log('这里采用上方弹出提示条的方式提醒用户身份信息已过期，重新登录。');
        } else {
          console.log('这里出错了，请检查下');
        }
        if (cbb) cbb(obj);
      });
    },
    httpServerInit ({commit, state}) {
      // state.httpServer.on('');
      state.httpServer.emit('user-list');
      state.httpServer.on('user-list', obj => {
        if (obj.code === 200) {
          commit('userListChange', obj.data);
        } else {
          console.log('这里确认下，不完善');
        }
      });
      state.httpServer.on('logout', obj => { // {userId: 1004}

      });
      state.httpServer.on('message', obj => { // {fromId, toId, type, message}

      });
    },
    sendMessage ({state, commit}, {message}) {
      let messageId = `${state.messageId}_${md5(message)}`;
      commit('messageIdChange');
      state.userList[state.itemIndex].list.push({
        type: 3,
        message,
        messageId
      });
      state.httpServer.emit('message', {
        fromId: state.userInfo.userId,
        toId: state.itemIndex,
        message: message,
        messageId
      });
    }
  },
  modules: {
    chat
  }
};

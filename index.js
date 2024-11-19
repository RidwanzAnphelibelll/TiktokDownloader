#!/usr/bin/env node

const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const axios = require('axios');
const chalk = require('chalk');
const util = require('util');
const fs = require('fs');

const settings = JSON.parse(fs.readFileSync('settings.json', 'utf8'));
const telegramBotToken = settings.telegramBotToken;
const startTime = new Date();

const bot = new TelegramBot(telegramBotToken, { polling: true });
const app = express();
const port = process.env.PORT || 3000;
const sleep = util.promisify(setTimeout);

app.use(express.json());

const tiktok = async (url) => {
  const host = 'https://www.tikwm.com/';
  const res = await axios.post(
    host + 'api/',
    new URLSearchParams({
      url: url,
      count: 1,
      cursor: 0,
      web: 1,
      hd: 1,
    }),
    {
      headers: {
        'accept': 'application/json, text/javascript, */*; q=0.01',
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'sec-ch-ua': '"Chromium";v="104", " Not A;Brand";v="99", "Google Chrome";v="104"',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36',
      }
    }
  );

  return {
    title_video: res.data.data.title,
    video: host + res.data.data.play,
    title_audio: res.data.data.music_info?.title,
    audio: host + res.data.data.music
  };
};

bot.setMyCommands([
  {
    command: '/start',
    description: 'Mulai Percakapan Baru',
  },
  {
    command: '/runtime',
    description: 'Cek Waktu Aktif Bot',
  },
]);

bot.onText(/^\/start$/, async (msg) => {
  bot.sendChatAction(msg.chat.id, 'typing');
  bot.sendMessage(msg.chat.id, `Halo ${msg.from.first_name} 👋\n\nBot ini dirancang khusus untuk membantu Anda mendownload video dan audio TikTok secara otomatis.\nCukup kirimkan URL video TikTok yang ingin Anda download, dan bot ini akan menyelesaikan tugasnya dengan cepat dan mudah!\n`, {
    reply_to_message_id: msg.message_id
  });
});

bot.onText(/^\/runtime$/, (msg) => {
  bot.sendChatAction(msg.chat.id, 'typing');
  const uptime = new Date() - startTime;
  const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
  const hours = Math.floor((uptime / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((uptime / (1000 * 60)) % 60);
  const seconds = Math.floor((uptime / 1000) % 60); 
  bot.sendMessage(msg.chat.id, `Bot Telah Aktif Selama:\n${days} Hari ${hours} Jam ${minutes} Menit ${seconds} Detik`, {
    reply_to_message_id: msg.message_id
  });
});

bot.on('message', async (msg) => {
  const urlRegex = /^https:\/\/.*tiktok\.com\/.+/;
  if (urlRegex.test(msg.text)) {
    const url = msg.text;
    const options = [
      {
        text: 'Video',
        callback_data: 'video',
      },
      {
        text: 'Audio',
        callback_data: 'audio',
      },
    ];
        
    const message = await bot.sendMessage(msg.chat.id, 'Pilih Format Yang Ingin Didownload:', {
      reply_markup: {
        inline_keyboard: [options],
      }
    });

    bot.once('callback_query', async (callbackQuery) => {
      if (callbackQuery.data === 'video') {
        try {
          bot.sendChatAction(msg.chat.id, 'upload_video');
          const data = await tiktok(url);
          await bot.sendVideo(msg.chat.id, data.video, { caption: data.title_video, reply_to_message_id: msg.message_id });
          bot.deleteMessage(msg.chat.id, message.message_id);

        } catch (error) { 
          bot.sendChatAction(msg.chat.id, 'typing');
          bot.sendMessage(msg.chat.id, 'Maaf, Terjadi Kesalahan Saat Mengunduh Video TikTok.', {
            reply_to_message_id: msg.message_id
          });
          bot.deleteMessage(msg.chat.id, message.message_id);
          console.error(chalk.red(`[ ERROR ] ${msg.chat.id}: ${error.message}`));
        }
        
      } else if (callbackQuery.data === 'audio') {
        try {
          bot.sendChatAction(msg.chat.id, 'upload_audio');
          const data = await tiktok(url);
          await bot.sendAudio(msg.chat.id, data.audio, { caption: data.title_audio, reply_to_message_id: msg.message_id }); 
          bot.deleteMessage(msg.chat.id, message.message_id);
          
        } catch (error) {
          bot.sendChatAction(msg.chat.id, 'typing');
          bot.sendMessage(msg.chat.id, 'Maaf, Terjadi Kesalahan Saat Mengunduh Audio TikTok.', {
            reply_to_message_id: msg.message_id
          });
          bot.deleteMessage(msg.chat.id, message.message_id);
          console.error(chalk.red(`[ ERROR ] ${msg.chat.id}: ${error.message}`));
        }
      }
    });
  }
});

app.listen(port, () => {
  console.log(chalk.green(`Bot Sedang Berjalan Pada Port ${port}`));
});
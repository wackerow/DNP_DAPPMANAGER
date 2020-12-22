import TelegramBot from "node-telegram-bot-api";
import { statsCpuGet, statsDiskGet, statsMemoryGet } from "../../calls";
import * as db from "../../db";
import { logs } from "../../logs";
import { buildTelegramMessage } from "./buildTelegramMessage";
import { bold, url } from "./utils";

/**
 * Polls for commands and responds.
 * Channel ID is not needed to response to messages
 * @param telegramToken
 */
export async function telegramCommands(bot: TelegramBot): Promise<void> {
  try {
    bot.startPolling();
    // POLLING ERRORS
    // 1. EFATAL if error was fatal e.g. network error
    // 2. EPARSE if response body could not be parsed
    // 3. ETELEGRAM if error was returned from Telegram servers
    // ETELEGRAM: 409 Conflict  =>  More than one bot instance polling
    // ETELEGRAM: 404 Not Found => wrong token or not found
    bot.on("polling_error", error => {
      throw Error(`${error.name}: ${error.message}`);
    });
    // get disk stats
    bot.onText(/\/disk/, async msg => {
      try {
        const chatId = msg.chat.id.toString();
        const diskStats = await statsDiskGet();
        const diskMessage = `${bold("Disk free")} ${
          diskStats.free
        } bytes | ${bold("Disk used")} ${diskStats.used} bytes | ${bold(
          "Disk total"
        )} ${diskStats.total} bytes | ${bold("Disk percentage")} ${
          diskStats.usedPercentage
        } %`;
        const message = buildTelegramMessage({
          telegramMessage: diskMessage,
          telegramMessageType: "Stats"
        });

        await sendTelegramMessage({ bot, chatId, message });
      } catch (e) {
        logs.error("Error on telegram daemon. /disk command", e);
      }
    });

    // get cpu stats
    bot.onText(/\/cpu/, async msg => {
      try {
        const chatId = msg.chat.id.toString();
        const cpuStats = await statsCpuGet();
        const cpuMessage = `${bold("CPU percentage")} ${
          cpuStats.usedPercentage
        } %`;
        const message = buildTelegramMessage({
          telegramMessage: cpuMessage,
          telegramMessageType: "Stats"
        });

        await sendTelegramMessage({ bot, chatId, message });
      } catch (e) {
        logs.error("Error on telegram daemon. /cpu command", e);
      }
    });

    // get memory stats
    bot.onText(/\/memory/, async msg => {
      try {
        const chatId = msg.chat.id.toString();
        const memoryStats = await statsMemoryGet();
        const memoryMessage = `${bold("Memory free")} ${
          memoryStats.free
        } bytes | ${bold("Memory used")} ${memoryStats.used} bytes  | ${bold(
          "Memory total"
        )} ${memoryStats.total} bytes | ${bold("Memory percentage")} ${
          memoryStats.usedPercentage
        } %`;
        const message = buildTelegramMessage({
          telegramMessage: memoryMessage,
          telegramMessageType: "Stats"
        });

        await sendTelegramMessage({ bot, chatId, message });
      } catch (e) {
        logs.error("Error on telegram daemon. /memory command", e);
      }
    });

    // set the channel ID
    bot.onText(/\/channel/, async msg => {
      try {
        const chatId = msg.chat.id.toString();
        const channelIds = db.telegramChannelIds.get();
        let message = "";
        if (channelIds.includes(chatId)) {
          message = buildTelegramMessage({
            telegramMessage: "Channel ID already exists",
            telegramMessageType: "Danger"
          });
        } else {
          channelIds.push(chatId);
          db.telegramChannelIds.set(channelIds);
          message = buildTelegramMessage({
            telegramMessage: "Succesfully saved channel ID",
            telegramMessageType: "Success"
          });
        }

        await sendTelegramMessage({ bot, chatId, message });
      } catch (e) {
        logs.error("Error on telegram daemon. /channel command", e);
      }
    });

    // Remove channel ID
    bot.onText(/\/channelremove/, async msg => {
      try {
        const chatId = msg.chat.id.toString();
        const channelIds = db.telegramChannelIds.get();
        let message = "";
        if (channelIds.includes(chatId)) {
          channelIds.splice(channelIds.indexOf(chatId), 1);
          db.telegramChannelIds.set(channelIds);
          message = buildTelegramMessage({
            telegramMessage: "Succesfully removed channel ID",
            telegramMessageType: "Success"
          });
        } else {
          message = buildTelegramMessage({
            telegramMessage: "Channel Id not found",
            telegramMessageType: "Danger"
          });
        }

        await sendTelegramMessage({ bot, chatId, message });
      } catch (e) {
        logs.error("Error on telegram daemon. /channel command", e);
      }
    });

    // returns help content
    bot.onText(/\/help/, async msg => {
      try {
        const chatId = msg.chat.id.toString();
        const message = buildTelegramMessage({
          telegramMessage: `Commands: ${bold("/disk")} & ${bold(
            "/memory"
          )} & ${bold("/cpu")} returns stats from your DAppNode | ${bold(
            "/channel"
          )} sets the channel ID to receive alerts | ${bold(
            "/channelremove"
          )} removes the channel ID | more information ${url(
            "here",
            "https://hackmd.io/iJngUGVkRMqxOEqFEjT0XA"
          )}`,
          telegramMessageType: "Notification"
        });

        await sendTelegramMessage({ bot, chatId, message });
      } catch (e) {
        logs.error("Error on telegram daemon. /help command", e);
      }
    });
  } catch (e) {
    throw Error("Error sending telegram message");
  }
}

async function sendTelegramMessage({
  bot,
  chatId,
  message
}: {
  bot: TelegramBot;
  chatId: string;
  message: string;
}): Promise<void> {
  await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
}

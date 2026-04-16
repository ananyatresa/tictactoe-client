import { Client } from "@heroiclabs/nakama-js";
import { v4 as uuidv4 } from "uuid";

const OpCode = {
  START: 1, // server sends New game round starting.
  UPDATE: 2, // server updates to the state of an ongoing round.
  DONE: 3, // server sends when game round has just completed.
  MOVE: 4, // client sends a move
  REJECTED: 5, // server rejected your move
  OPPONENT_LEFT: 6, // server sends when opponenet left the game
  INVITE_AI: 7, // client wants AI opponent
};

class Nakama {
  constructor() {
    this.client = null;
    this.session = null;
    this.socket = null;
    this.matchId = null;
  }

  async authenticate() {
    const useSSL = false;
    this.client = new Client("defaultkey", "localhost", "7350", useSSL);
    const deviceId = uuidv4();
    console.log("Authenticating with deviceId:", deviceId);
    this.session = await this.client.authenticateDevice(deviceId, true);

    const trace = false;
    this.socket = this.client.createSocket(useSSL, trace);
    await this.socket.connect(this.session);
    console.log("Connected as:", this.session.user_id);
  }

  async findMatch(fast = false) {
    // Calls rpcFindMatch in index.js
    // fast=false → normal mode, fast=true → timed mode
    const result = await this.client.rpc(
      this.session, // which user currently calling this
      "find_match_js", // matches rpcIdFindMatch in index.js
      { fast: fast ? 1 : 0 }, // payload - simple vs timed match
    );

    this.matchId = result.payload.matchIds[0]; //pick first matchId
    await this.socket.joinMatch(this.matchId);
    console.log("Joined match:", this.matchId);
    return this.matchId;
  }

  async sendMove(position) {
    // position is 0-8 (which cell was clicked)
    await this.socket.sendMatchState(
      this.matchId,
      OpCode.MOVE,
      JSON.stringify({ position }),
    );
  }

  async inviteAI() {
    // Triggers the TensorFlow AI opponent — bonus feature!
    await this.socket.sendMatchState(this.matchId, OpCode.INVITE_AI, {});
  }

  onMatchData(callback) {
    // This is called every time Nakama sends a message
    this.socket.onmatchdata = (result) => {
      const opCode = result.op_code;
      let data = {};

      try {
        // Nakama sends data as binary, need to decode it
        data = JSON.parse(new TextDecoder().decode(result.data));
      } catch (e) {}
      console.log("Raw opCode from server:", opCode, "data:", data);
      callback(opCode, data);
    };
  }

  getUserId() {
    return this.session.user_id;
  }
}

// Export as singleton — one connection for the whole app
export default new Nakama();
export { OpCode };

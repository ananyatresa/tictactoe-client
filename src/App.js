import "./App.css";
import { useState, useEffect, useRef } from "react";
import nakama, { OpCode } from "./nakama";

export default function App() {
  const [screen, setScreen] = useState("lobby");
  const [board, setBoard] = useState(Array(9).fill(null));
  const [myMark, setMyMark] = useState(null);
  const [currentMark, setCurrentMark] = useState(null);
  const [winner, setWinner] = useState(null);
  const [winnerPositions, setWinnerPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [opponentLeft, setOpponentLeft] = useState(false);

  const myMarkRef = useRef(null);
  const screenRef = useRef("lobby");

  useEffect(() => {
    async function init() {
      await nakama.authenticate();
      setLoading(false);

      // Listen for all server messages
      nakama.onMatchData((opCode, data) => {
        switch (opCode) {
          case OpCode.START:
            // ← THIS is the key message
            // Both players joined, server assigned X and O
            // data.marks = { "userId1": 1, "userId2": 2 }
            const userId = nakama.getUserId();
            const mark = data.marks[userId];
            console.log(
              "Game START — UserId :",
              userId,
              "I am:",
              mark === 1 ? "X" : "O",
            );
            myMarkRef.current = mark;
            setMyMark(mark);
            setBoard([...data.board]);
            setCurrentMark(data.mark); // always Mark.X (1) goes first
            setScreen("game");
            screenRef.current = "game";
            break;

          case OpCode.UPDATE:
            // A move was made, here's the new board
            setBoard([...data.board]);
            setCurrentMark(data.mark);
            break;

          case OpCode.DONE:
            // Game over
            setBoard([...data.board]);
            setWinner(data.winner);
            setWinnerPositions(data.winnerPositions || []);
            setScreen("result");
            screenRef.current = "result";
            break;

          case OpCode.REJECTED:
            console.log("Move rejected by server");
            // optional: add shake animation on board
            break;

          case OpCode.OPPONENT_LEFT:
            // Opponent disconnected mid game
            console.log("Opponent left the match");
            setOpponentLeft(true);
            setScreen("result");
            screenRef.current = "result";
            break;

          default:
            console.log("Unhandled opCode:", opCode);
        }
      });
    }
    init();
  }, []);

  async function handleFindMatch(fast = false) {
    setScreen("finding");
    screenRef.current = "finding";
    await nakama.findMatch(fast);
  }

  async function handleCellClick(index) {
    const currentMarkVal = currentMark;
    const myMarkVal = myMarkRef.current; // ← use ref not state

    console.log("Cell clicked:", index);
    console.log("My mark:", myMarkVal, "Current turn:", currentMarkVal);
    await nakama.sendMove(index);
  }

  function handlePlayAgain() {
    setBoard(Array(9).fill(null));
    setWinner(null);
    setWinnerPositions([]);
    setOpponentLeft(false);
    myMarkRef.current = null;
    setMyMark(null);
    setCurrentMark(null);
    setScreen("lobby");
    screenRef.current = "lobby";
  }

  if (loading)
    return (
      <div className="screen">
        <div className="scanner" />
        <p className="finding-dots">CONNECTING</p>
      </div>
    );

  if (screen === "lobby") return <Lobby onFindMatch={handleFindMatch} />;
  if (screen === "finding") return <Finding />;
  if (screen === "game")
    return (
      <Game
        board={board}
        myMark={myMarkRef.current}
        currentMark={currentMark}
        winnerPositions={winnerPositions}
        onCellClick={handleCellClick}
      />
    );
  if (screen === "result")
    return (
      <Result
        winner={winner}
        myMark={myMarkRef.current}
        opponentLeft={opponentLeft}
        onPlayAgain={handlePlayAgain}
      />
    );
}

function Lobby({ onFindMatch }) {
  return (
    <div className="screen">
      <h1 className="lobby-title">XOXO</h1>
      <p className="lobby-subtitle">Multiplayer · Real-time</p>
      <div className="lobby-grid">
        {Array(9)
          .fill(null)
          .map((_, i) => (
            <div key={i} className="lobby-cell" />
          ))}
      </div>
      <div className="btn-group">
        <button className="btn" onClick={() => onFindMatch(false)}>
          Find Match
        </button>
        <button className="btn btn-fast" onClick={() => onFindMatch(true)}>
          Fast Mode ⚡
        </button>
      </div>
    </div>
  );
}

function Finding() {
  return (
    <div className="screen">
      <div className="scanner" />
      <p className="finding-label" style={{ marginTop: "2rem" }}>
        FINDING OPPONENT
      </p>
      <p className="finding-dots">WAITING</p>
    </div>
  );
}

function Game({ board, myMark, currentMark, winnerPositions, onCellClick }) {
  const isMyTurn = currentMark === myMark;
  const markLabel = myMark === 1 ? "X" : "O";

  return (
    <div className="screen">
      <div className="game-header">
        <div className={`player-badge ${markLabel.toLowerCase()}`}>
          YOU · {markLabel}
        </div>
        <div className={`player-badge ${myMark === 1 ? "o" : "x"}`}>
          OPP · {myMark === 1 ? "O" : "X"}
        </div>
      </div>

      <p className={`status-bar ${isMyTurn ? "my-turn" : ""}`}>
        {isMyTurn ? "YOUR TURN" : "OPPONENT'S TURN"}
      </p>

      <div className="board">
        {board.map((cell, i) => {
          const isWinCell = winnerPositions.includes(i);
          const isEmpty = !cell;
          return (
            <div
              key={i}
              className={[
                "cell",
                isMyTurn && isEmpty ? "clickable" : "",
                isWinCell ? "winning" : "",
              ].join(" ")}
              onClick={() => onCellClick(i)}
            >
              {cell === 1 && <span className="cell-x">X</span>}
              {cell === 2 && <span className="cell-o">O</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Result({ winner, myMark, opponentLeft, onPlayAgain }) {
  const iWon = winner === myMark;
  const isDraw = winner === null || winner === 0;

  let label, cls, sub;
  if (opponentLeft) {
    label = "OPPONENT LEFT";
    cls = "win";
    sub = "You win by default";
  } else if (isDraw) {
    label = "DRAW";
    cls = "draw";
    sub = "No winner this round";
  } else if (iWon) {
    label = "VICTORY";
    cls = "win";
    sub = "Well played";
  } else {
    label = "DEFEATED";
    cls = "lose";
    sub = "Better luck next time";
  }

  return (
    <div className="screen">
      <p className={`result-label ${cls}`}>{label}</p>
      <p className="result-sub">{sub}</p>
      <button className="btn" onClick={onPlayAgain}>
        PLAY AGAIN
      </button>
    </div>
  );
}

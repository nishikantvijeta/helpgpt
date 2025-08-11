import React, { useContext, useEffect } from "react";
import { MyContext } from "./MyContext.jsx";
import { v1 as uuidv1 } from "uuid";

function Sidebar() {
    const {
        allThreads, setAllThreads, currThreadId, setNewChat, setPrompt,
        setReply, setCurrThreadId, setPrevChats, token
    } = useContext(MyContext);

    // Fetch all threads from backend only if logged in
    const getAllThreads = async () => {
        if (!token) return;  // <-- Added: skip fetch if guest

        try {
            const response = await fetch("https://helpgpt-backened.onrender.com/api/thread", {
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { "Authorization": `Bearer ${token}` } : {})
                }
            });
            const res = await response.json();
            const threads = Array.isArray(res) ? res : res.threads || [];
            const filteredData = threads.map(thread => ({
                threadId: thread.threadId,
                title: thread.title
            }));
            setAllThreads(filteredData);
        } catch (err) {
            console.log(err);
        }
    };

    useEffect(() => {
        getAllThreads();
    }, [currThreadId, token]); // <-- Added token to dependency to reload on login/logout

    const createNewChat = () => {
        setNewChat(true);
        setPrompt("");
        setReply(null);
        setCurrThreadId(uuidv1());
        setPrevChats([]);
    };

    // When a thread is clicked, fetch chat history if logged in
    const changeThread = async (newThreadId) => {
        setCurrThreadId(newThreadId);
        if (!token) {
            // Guests do not have threads stored in backend; maybe clear chats or ignore
            setPrevChats([]);
            setReply(null);
            setNewChat(true);
            return;
        }

        try {
            const response = await fetch(`https://helpgpt-backened.onrender.com/api/thread/${newThreadId}`, {
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { "Authorization": `Bearer ${token}` } : {})
                }
            });
            const res = await response.json();
            setPrevChats(res);
            setNewChat(false);
            setReply(null);
        } catch (err) {
            console.log(err);
        }
    };

    // Delete thread only if logged in (guests have no backend threads)
    const deleteThread = async (threadId) => {
        if (!token) return; // <-- Added: guests cannot delete backend threads

        try {
            const response = await fetch(`https://helpgpt-backened.onrender.com/api/thread/${threadId}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { "Authorization": `Bearer ${token}` } : {})
                }
            });
            await response.json();
            setAllThreads(prev => prev.filter(thread => thread.threadId !== threadId));
            if (threadId === currThreadId) {
                createNewChat();
            }
        } catch (err) {
            console.log(err);
        }
    };

    return (
        <section className="w-80 bg-gray-800 text-white flex flex-col h-screen border-r border-gray-700">
            <button
                onClick={createNewChat}
                className="flex items-center gap-2 px-4 py-3 bg-gray-900 hover:bg-gray-700 rounded-md m-4 transition"
            >
                <img src="src/assets/blacklogo.png" alt="gpt logo" className="w-8 h-8" />
                <span>
                    <i className="fa-solid fa-pen-to-square"></i>
                </span>
                <span className="font-semibold">New Chat</span>
            </button>
            <ul className="flex-1 overflow-y-auto px-2">
                {/* Show threads only for logged-in users */}
                {token && allThreads?.map((thread, idx) => (
                    <li
                        key={idx}
                        onClick={() => changeThread(thread.threadId)}
                        className={`flex items-center justify-between px-3 py-2 rounded cursor-pointer mb-2 transition ${
                            thread.threadId === currThreadId
                                ? "bg-blue-600 text-white"
                                : "bg-gray-700 hover:bg-gray-600"
                        }`}
                    >
                        <span className="truncate">{thread.title}</span>
                        <i
                            className="fa-solid fa-trash ml-2 text-red-400 hover:text-red-600"
                            onClick={e => {
                                e.stopPropagation();
                                deleteThread(thread.threadId);
                            }}
                        ></i>
                    </li>
                ))}
            </ul>
            <div className="p-4 text-center text-xs text-gray-400">
                <p>Made by Nishikant &hearts;</p>
            </div>
        </section>
    );
}

export default Sidebar;

import ollama
import sys

messages = [
    {
        "role": "system",
        "content": "You are a sharpest teacher like Richard Fieynman but without any sarcasm. Explain concepts in simple terms with examples. If you don't know the answer, admit it honestly."
    }
]


def _extract_assistant_text(resp) -> str:
    """Robustly extract assistant text from different response shapes returned by ollama.

    Handles objects with attributes (`response`, `message`) and dict-like returns.
    Falls back to string representations if structured content isn't found.
    """
    # Prefer a top-level 'response' attribute
    try:
        if hasattr(resp, "response") and resp.response:
            return resp.response
    except Exception:
        pass

    # If there's a 'message' attribute, try to pull content from it.
    try:
        if hasattr(resp, "message"):
            msg = resp.message
            if isinstance(msg, dict):
                return msg.get("content") or msg.get("text") or str(msg)
            # object-like message
            content = getattr(msg, "content", None)
            if content:
                return content
            # try dict-style access
            try:
                return msg["content"]
            except Exception:
                return str(msg)
    except Exception:
        pass

    # Try pydantic/model dump or dict
    try:
        data = None
        if hasattr(resp, "model_dump"):
            data = resp.model_dump()
        elif hasattr(resp, "dict"):
            data = resp.dict()
        if isinstance(data, dict):
            if "response" in data and data["response"]:
                return data["response"]
            if "message" in data:
                m = data["message"]
                if isinstance(m, dict):
                    return m.get("content") or m.get("text") or str(m)
                return str(m)
    except Exception:
        pass

    # Final fallback
    try:
        return str(resp)
    except Exception:
        return ""


def _chat_loop():
    try:
        while True:
            user_input = input("You: ")
            if user_input.lower() in ["exit", "quit"]:
                print("Exiting the chatbot.")
                break

            messages.append({"role": "user", "content": user_input})

            try:
                # Do not pass images to `ollama.chat()`; pass only the conversation messages.
                response = ollama.chat(model="ministral-3:3b", messages=messages)
            except Exception as e:
                print("Error during chat call:", e)
                # don't exit; allow the user to try again
                continue

            assistant_text = _extract_assistant_text(response) or ""
            print("Jarvis:", assistant_text)

            # Append assistant response to the conversation for context
            messages.append({"role": "assistant", "content": assistant_text})

            print("\n")
    except KeyboardInterrupt:
        print("\nChat interrupted. Exiting.")


if __name__ == "__main__":
    _chat_loop()
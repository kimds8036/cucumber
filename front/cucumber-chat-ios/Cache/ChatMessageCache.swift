import Foundation

class ChatMessageCache {
    static let shared = ChatMessageCache()

    private let defaults = UserDefaults.standard
    private let maxMessages = 50
    private let ttlSeconds: Double = 3600

    private func cacheKey(_ roomId: Int) -> String { "chat_msg_\(roomId)" }
    private func metaKey(_ roomId: Int) -> String { "chat_meta_\(roomId)" }

    func save(messages: [ChatMessage], roomId: Int) {
        let trimmed = Array(messages.prefix(maxMessages))
        guard let data = try? JSONEncoder().encode(trimmed) else { return }
        defaults.set(data, forKey: cacheKey(roomId))
        defaults.set(Date().timeIntervalSince1970, forKey: metaKey(roomId))
    }

    func load(roomId: Int) -> [ChatMessage]? {
        let savedAt = defaults.double(forKey: metaKey(roomId))
        guard savedAt > 0, Date().timeIntervalSince1970 - savedAt < ttlSeconds else {
            clear(roomId: roomId)
            return nil
        }
        guard
            let data = defaults.data(forKey: cacheKey(roomId)),
            let messages = try? JSONDecoder().decode([ChatMessage].self, from: data)
        else { return nil }
        return messages
    }

    func clear(roomId: Int) {
        defaults.removeObject(forKey: cacheKey(roomId))
        defaults.removeObject(forKey: metaKey(roomId))
    }

    private func postCacheKey(_ postId: Int) -> String { "post_cache_\(postId)" }

    func savePost(_ post: PostCardData, postId: Int) {
        let dict: [String: Any] = [
            "likes": post.likes,
            "comments": post.comments,
            "isLiked": post.isLiked,
            "thumbnail": post.thumbnail
        ]
        defaults.set(dict, forKey: postCacheKey(postId))
    }

    func loadPost(postId: Int) -> [String: Any]? {
        defaults.dictionary(forKey: postCacheKey(postId))
    }
}

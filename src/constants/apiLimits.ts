/**
 * Anthropic API 限制常量
 *
 * 当前仅实现 FileReadTool 所需的 PDF 相关常量
 * TODO: 图片限制、媒体限制等待后续补齐
 */

/**
 * PDF 原始文件最大大小（API 请求限制）
 * Base64 编码增大约 33%，20MB → ~27MB base64，留出对话上下文空间
 */
export const PDF_TARGET_RAW_SIZE = 20 * 1024 * 1024 // 20 MB

/**
 * 超过此大小的 PDF 提取为页面图片而非 base64 文档块
 */
export const PDF_EXTRACT_SIZE_THRESHOLD = 3 * 1024 * 1024 // 3 MB

/**
 * Read 工具单次调用 pages 参数的最大页数
 */
export const PDF_MAX_PAGES_PER_READ = 20

/**
 * @ mention 内联阈值：超过此页数的 PDF 以引用方式处理
 */
export const PDF_AT_MENTION_INLINE_THRESHOLD = 10

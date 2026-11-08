/** 读取本地图片并裁剪为 256×256 的 JPEG data URL（头像） */
export function loadAvatar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('请选择图片文件'))
    if (file.size > 15 * 1024 * 1024) return reject(new Error('图片不能超过 15MB'))
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const size = 256
      const c = document.createElement('canvas')
      c.width = size
      c.height = size
      const ctx = c.getContext('2d')!
      const s = Math.min(img.width, img.height)
      ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size)
      URL.revokeObjectURL(url)
      resolve(c.toDataURL('image/jpeg', 0.86))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('无法读取该图片'))
    }
    img.src = url
  })
}

import { expect, test } from '@playwright/test'

async function signIn(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.getByRole('button', { name: '进入工作台' }).click()
  await expect(page.getByRole('heading', { name: '津智助理 - 试点概览' })).toBeVisible()
}

test('single ticket analysis falls back safely and opens the review modal', async ({ page }) => {
  await signIn(page)
  await page.getByRole('button', { name: '工单中心' }).click()
  await expect(page.getByRole('heading', { name: '工单预处理中心' })).toBeVisible()
  await expect(page.getByText('复核准确率')).toBeVisible()
  await expect(page.getByText('待评测')).toBeVisible()

  await page.getByPlaceholder('例如：12号楼消防通道被电动车占用').fill('12号楼消防通道被电动车占用，晚上老人出行也不安全，希望社区尽快协调。')
  await page.getByRole('button', { name: '智能分析并入库' }).click()

  await expect(page.getByRole('heading', { name: '工单 AI 预处理' })).toBeVisible()
  await expect(page.locator('.ticket-modal').getByText('消防安全')).toBeVisible()
  await expect(page.getByRole('button', { name: '复核正确' })).toBeVisible()
})

test('toolbox modal copy is Chinese and interactive', async ({ page }) => {
  await signIn(page)
  await page.getByRole('button', { name: '创意工具箱' }).click()
  await page.getByRole('button', { name: '生成海报' }).click()

  await expect(page.locator('.tool-modal').getByRole('heading', { name: 'AI 海报生成器' })).toBeVisible()
  await expect(page.locator('.tool-modal').getByText('津智助理 · 社区通知转海报')).toBeVisible()
  await page.getByRole('button', { name: '温和邻里' }).click()
  await page.getByRole('button', { name: '手机长图' }).click()
  await expect(page.getByText('预览尺寸：手机长图')).toBeVisible()
})

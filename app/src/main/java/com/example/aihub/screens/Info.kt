package com.example.aihub.screens

import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.aihub.R
import com.example.aihub.core.*
import com.example.aihub.ui.*
import kotlinx.coroutines.launch

// ---------------------------------------------------------------- تنظیمات

@Composable
fun SettingsScreen(onBack: () -> Unit) {
    val ctx = LocalContext.current
    val scope = rememberCoroutineScope()
    val task = remember { TaskState() }
    val listTask = remember { TaskState() }
    val c = MaterialTheme.colorScheme

    var prov by remember { mutableStateOf(Store.provider) }
    var key by remember(prov) { mutableStateOf(Store.keyFor(prov)) }
    var model by remember(prov) { mutableStateOf(Store.modelFor(prov)) }
    var models by remember(prov) { mutableStateOf<List<String>>(emptyList()) }
    var show by remember { mutableStateOf(false) }
    var testResult by remember { mutableStateOf("") }

    ToolScaffold("تنظیمات", onBack) {
        Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            SectionTitle("سرویس هوش مصنوعی")
            ChipRow(Provider.values().toList(), prov, { it.label }) { prov = it }
            Surface(
                Modifier.padding(horizontal = 16.dp).fillMaxWidth(),
                shape = RoundedCornerShape(18.dp), color = c.surfaceVariant,
            ) {
                Text(prov.note, Modifier.padding(14.dp), fontSize = 13.sp, lineHeight = 20.sp)
            }

            if (prov.needsKey) {
                prov.keyUrl?.let { url ->
                    TextButton(onClick = { openUrl(ctx, url) }, Modifier.padding(horizontal = 8.dp)) {
                        Icon(Icons.Rounded.VpnKey, null); Spacer(Modifier.width(6.dp)); Text("دریافت کلید رایگان ${prov.label}")
                    }
                }
                AppField(
                    key, { key = it }, "API Key", Modifier.padding(horizontal = 16.dp),
                    ltr = true, password = !show, maxLines = 1,
                    trailing = {
                        IconButton(onClick = { show = !show }) {
                            Icon(if (show) Icons.Rounded.VisibilityOff else Icons.Rounded.Visibility, "نمایش")
                        }
                    },
                )
            }

            AppField(model, { model = it }, "نام مدل", Modifier.padding(horizontal = 16.dp), ltr = true, maxLines = 1)
            OutlinedButton(
                onClick = {
                    Store.save(prov, key.trim(), model.trim())
                    listTask.launch(scope) { models = Ai.listModels() }
                },
                Modifier.padding(horizontal = 16.dp).fillMaxWidth(),
            ) {
                if (listTask.loading) CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
                else Text("فهرست مدل‌های این سرویس")
            }
            ErrorText(listTask.error)
            if (models.isNotEmpty()) {
                Surface(
                    Modifier.padding(horizontal = 16.dp).fillMaxWidth().heightIn(max = 240.dp),
                    shape = RoundedCornerShape(18.dp), color = c.surfaceVariant,
                ) {
                    Column(Modifier.verticalScroll(rememberScrollState())) {
                        models.take(80).forEach { m ->
                            Text(
                                m,
                                Modifier.fillMaxWidth().clickable { model = m }.padding(horizontal = 14.dp, vertical = 10.dp),
                                fontSize = 13.sp,
                                color = if (m == model) c.primary else c.onSurfaceVariant,
                                fontWeight = if (m == model) FontWeight.Bold else FontWeight.Normal,
                            )
                        }
                    }
                }
            }

            GradButton(
                "ذخیره و فعال‌سازی", icon = Icons.Rounded.Check,
                modifier = Modifier.padding(horizontal = 16.dp).fillMaxWidth(),
                onClick = { Store.save(prov, key.trim(), model.trim()); toast(ctx, "ذخیره شد") },
            )
            OutlinedButton(
                onClick = {
                    Store.save(prov, key.trim(), model.trim())
                    task.launch(scope) { testResult = Ai.generate("یک جمله‌ی کوتاه و دوستانه‌ی فارسی بگو.", maxTokens = 100) }
                },
                Modifier.padding(horizontal = 16.dp).fillMaxWidth(),
            ) {
                if (task.loading) CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp) else Text("تست اتصال")
            }
            ErrorText(task.error)
            if (testResult.isNotBlank() && task.error == null) {
                Text("✅ $testResult", Modifier.padding(horizontal = 20.dp), fontSize = 13.5.sp)
            }

            SectionTitle("اگر کلید یک سرویس جواب نداد")
            var fb by remember { mutableStateOf(Store.autoFallback) }
            Row(Modifier.padding(horizontal = 16.dp), verticalAlignment = Alignment.CenterVertically) {
                Switch(checked = fb, onCheckedChange = {
                    fb = it; Store.saveFlags(it, Store.voiceOnline, Store.botVoice)
                })
                Spacer(Modifier.width(10.dp))
                Text("جایگزینی خودکار سرویس (پیشنهادی)", fontSize = 13.5.sp)
            }
            Text(
                "برای هر سرویس که کلید بگیری و یک‌بار «ذخیره» بزنی، برنامه خودش وقتی سهمیه‌ی سرویس اصلی تمام شد یا خطا داد، " +
                    "سرویس بعدی را امتحان می‌کند. بهترین ترکیب رایگان: Groq + Cerebras.",
                Modifier.padding(horizontal = 20.dp), fontSize = 12.sp, color = c.onBackground.copy(alpha = 0.7f), lineHeight = 18.sp,
            )

            SectionTitle("کلید Pollinations (تصویر و صدا، اختیاری)")
            var pk by remember { mutableStateOf(Store.pollKey) }
            TextButton(onClick = { openUrl(ctx, "https://enter.pollinations.ai") }, Modifier.padding(horizontal = 8.dp)) {
                Icon(Icons.Rounded.VpnKey, null); Spacer(Modifier.width(6.dp)); Text("دریافت کلید رایگان (ورود با GitHub)")
            }
            AppField(
                pk, { pk = it }, "Pollinations Key (sk_…)", Modifier.padding(horizontal = 16.dp),
                ltr = true, password = true, maxLines = 1,
            )
            OutlinedButton(
                onClick = { Store.savePoll(pk); toast(ctx, "ذخیره شد") },
                Modifier.padding(horizontal = 16.dp).fillMaxWidth(),
            ) { Text("ذخیره‌ی کلید Pollinations") }
            Text(
                "ساخت نقاشی، گفتار به ویدیو، متن به صدا، چت صوتی و صدای دیگر از Pollinations استفاده می‌کنند. بدون کلید هم تلاش می‌کند، " +
                    "ولی اگر شلوغ بود یا خطا داد، با این کلید پایدارتر می‌شود.",
                Modifier.padding(horizontal = 20.dp), fontSize = 12.sp, color = c.onBackground.copy(alpha = 0.7f), lineHeight = 18.sp,
            )

            SectionTitle("صدای واقعی و آواز حرفه‌ای (پولی): کلید ElevenLabs")
            var mk by remember { mutableStateOf(Store.musicKey) }
            TextButton(onClick = { openUrl(ctx, "https://elevenlabs.io/app/settings/api-keys") }, Modifier.padding(horizontal = 8.dp)) {
                Icon(Icons.Rounded.VpnKey, null); Spacer(Modifier.width(6.dp)); Text("دریافت کلید ElevenLabs")
            }
            AppField(
                mk, { mk = it }, "ElevenLabs API Key", Modifier.padding(horizontal = 16.dp),
                ltr = true, password = true, maxLines = 1,
            )
            OutlinedButton(
                onClick = { Store.saveMusicKey(mk); toast(ctx, "ذخیره شد") },
                Modifier.padding(horizontal = 16.dp).fillMaxWidth(),
            ) { Text("ذخیره‌ی کلید ElevenLabs") }
            OutlinedButton(
                onClick = {
                    Store.saveMusicKey(mk)
                    scope.launch {
                        try {
                            val b = Poll.speech("سلام، این یک صدای آزمایشی فارسی است.", "nova", "fa")
                            toast(ctx, "ساخته شد با: ${Poll.lastSource}")
                            playAudioBytes(ctx, b)
                        } catch (e: Exception) {
                            toast(ctx, e.message ?: "خطا")
                        }
                    }
                },
                Modifier.padding(horizontal = 16.dp).fillMaxWidth(),
            ) { Text("تست صدای آنلاین (فارسی)") }
            Text(
                "با این کلید همه‌ی بخش‌های صوتی (چت صوتی، متن به صدا، گفتار به ویدیو، مربی زبان، صدای دیگر و خواندن ترانه) صدای واقعی‌تر می‌گیرند " +
                    "و «ساخت آواز حرفه‌ای» در ساخت آهنگ فعال می‌شود. API فقط با اشتراک پولی کار می‌کند. " +
                    "پشتیبانی کامل از فارسی را تأیید نکرده‌ام؛ اول «تست صدای آنلاین» را بزن.",
                Modifier.padding(horizontal = 20.dp), fontSize = 12.sp, color = c.onBackground.copy(alpha = 0.7f), lineHeight = 18.sp,
            )

            SectionTitle("صدای خود گوشی (وقتی آنلاین نیست)")
            var rate by remember { mutableStateOf(Store.ttsRate) }
            var pitch by remember { mutableStateOf(Store.ttsPitch) }
            val tester = remember { Speaker(ctx) }
            DisposableEffect(Unit) { onDispose { tester.shutdown() } }
            Text("سرعت: ${"%.2f".format(rate)}", Modifier.padding(horizontal = 20.dp), fontSize = 13.sp)
            Slider(
                value = rate, onValueChange = { rate = it }, valueRange = 0.5f..1.4f,
                onValueChangeFinished = { Store.saveTts(rate, pitch) }, modifier = Modifier.padding(horizontal = 16.dp),
            )
            Text("تُن (زیر و بمی): ${"%.2f".format(pitch)}", Modifier.padding(horizontal = 20.dp), fontSize = 13.sp)
            Slider(
                value = pitch, onValueChange = { pitch = it }, valueRange = 0.5f..1.4f,
                onValueChangeFinished = { Store.saveTts(rate, pitch) }, modifier = Modifier.padding(horizontal = 16.dp),
            )
            OutlinedButton(
                onClick = {
                    Store.saveTts(rate, pitch)
                    scope.launch { tester.speak("سلام، من دستیار هوشمند هستم. این صدای آزمایشی است.", locale = java.util.Locale("fa", "IR")) }
                },
                Modifier.padding(horizontal = 16.dp).fillMaxWidth(),
            ) { Text("پخش صدای آزمایشی") }
            Text(
                "برای فارسی، موتور صدای گوشی باید eSpeak NG باشد (راهنما در بخش «راهنما»). اگر صدا می‌لرزد، سرعت و تُن را کمی پایین بیاور.",
                Modifier.padding(horizontal = 20.dp), fontSize = 12.sp, color = c.onBackground.copy(alpha = 0.7f), lineHeight = 18.sp,
            )

            SectionTitle("ظاهر برنامه")
            ChipRow(listOf(0, 1, 2), Store.themeMode, { listOf("خودکار", "روشن", "تاریک")[it] }) { Store.saveTheme(it) }
            Text(
                "نکته: اگر سرویسی وصل نشد، VPN را روشن کن یا سرویس دیگری انتخاب کن. سهمیه‌ی رایگان هر سرویس محدود است.",
                Modifier.padding(horizontal = 20.dp), fontSize = 12.sp, color = c.onBackground.copy(alpha = 0.6f),
            )
            Spacer(Modifier.height(16.dp))
        }
    }
}


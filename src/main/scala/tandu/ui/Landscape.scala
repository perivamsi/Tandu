package tandu.ui

import com.raquo.laminar.api.L.*
import org.scalajs.dom

/** Mirrors the landscape-tablet media query in styles.css (the one that makes
  * `.fit` pages a single screen tall), for activities whose layout logic, not
  * just their CSS, differs there. */
object Landscape:
  val Query = "(orientation: landscape) and (min-width: 900px) and (min-height: 560px)"

  private val mql = dom.window.matchMedia(Query)
  private val state: Var[Boolean] = Var(mql.matches)
  mql.addEventListener("change", (_: dom.Event) => state.set(mql.matches))

  def now(): Boolean = state.now()
  val signal: Signal[Boolean] = state.signal.distinct

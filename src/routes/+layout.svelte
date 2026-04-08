<script lang="ts">
  import '../app.css';
</script>

<nav>
  <div class="logo">OLL Trainer</div>
  <div class="links">
    <a href="/">Home</a>
    <a href="/oll">OLL Cases</a>
    <a href="/oll/practice">OLL Practice</a>
    <a href="/bld-pairs">BLD Pairs</a>
  </div>
</nav>

<div class="container">
  <slot />
</div>

<style>
  nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 2rem;
    background: #111;
    height: 60px;
    border-bottom: 1px solid #333;
    position: sticky;
    top: 0;
    z-index: 1000;
  }
  .logo {
    font-weight: bold;
    font-size: 1.2rem;
    color: #ffd500;
  }
  .links {
    display: flex;
    gap: 1.5rem;
  }
  nav a {
    color: #aaa;
    text-decoration: none;
    font-size: 0.9rem;
    transition: color 0.2s;
  }
  nav a:hover {
    color: #fff;
  }
  .container {
    min-height: calc(100vh - 60px);
  }
</style>
